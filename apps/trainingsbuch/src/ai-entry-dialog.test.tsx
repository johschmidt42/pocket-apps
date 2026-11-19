import type { AiRequest, AiResult, AskAi } from "@pocket-apps/core/ai";
import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import type { AiAnswer, AiDraft } from "./ai-entry.ts";
import { App } from "./app.tsx";
import { isoDay } from "./dates.ts";
import type { Logbook } from "./schema.ts";

const FILE = "trainingsbuch/trainingsbuch.json";
const TODAY = isoDay(new Date());

const NO_SCORE = { seconds: null, capped: false, rounds: null, reps: null, kg: null };

function franDraft(patch: Partial<AiDraft> = {}): AiDraft {
  return {
    workoutId: "fran",
    newWorkout: null,
    date: TODAY,
    division: "rx",
    score: { ...NO_SCORE, seconds: 402 },
    loadKg: null,
    notes: "Pull-ups in 3 Sätzen",
    ...patch,
  };
}

function ok(answer: AiAnswer): AiResult<AiAnswer> {
  return {
    kind: "ok",
    data: answer,
    reply: { role: "assistant", text: JSON.stringify(answer) },
    usage: { inputTokens: 2000, cachedTokens: 0, outputTokens: 100, costUsd: 0.01 },
  };
}

const QUESTION: AiAnswer = { status: "question", message: "Rx oder Scaled?", draft: null };
const DRAFT: AiAnswer = { status: "draft", message: "Fran in 6:42, Rx.", draft: franDraft() };

/** A fake AI that gives these results, one per request. */
function fakeAsk(...results: AiResult<AiAnswer>[]) {
  const ask = vi.fn<(request: AiRequest<AiAnswer>) => Promise<AiResult<AiAnswer>>>();
  for (const result of results) ask.mockResolvedValueOnce(result);
  return ask;
}

async function openApp(ask: ReturnType<typeof fakeAsk> | undefined, data?: Logbook) {
  const folder = createMemoryFolder();
  if (data) {
    folder.files.set(FILE, {
      text: JSON.stringify({
        app: "trainingsbuch",
        schemaVersion: 1,
        savedWith: "1.0",
        savedAt: "2026-11-17T12:00:00.000Z",
        data,
      }),
      lastModified: 1,
    });
  }
  const user = userEvent.setup();
  render(
    <App
      folderHost={createMemoryFolderHost({ saved: folder })}
      // The fake has the type of one request. `AskAi` is generic (allowed in tests).
      {...(ask && { ask: ask as unknown as AskAi })}
    />,
  );
  await screen.findByRole("tab", { name: "Workouts" });
  return { folder, user };
}

function savedData(folder: ReturnType<typeof createMemoryFolder>): Logbook {
  return (JSON.parse(folder.files.get(FILE)?.text ?? "") as { data: Logbook }).data;
}

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  const dialog = screen.getByRole("dialog", { name: "Mit KI eintragen" });
  await user.type(within(dialog).getByRole("textbox"), text);
  await user.click(within(dialog).getByRole("button", { name: "Senden" }));
}

describe("Mit KI eintragen", () => {
  it("asks back, shows the draft and saves the result after the user confirms it", async () => {
    const ask = fakeAsk(ok(QUESTION), ok(DRAFT));
    const { folder, user } = await openApp(ask);

    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    const dialog = screen.getByRole("dialog", { name: "Mit KI eintragen" });
    expect(
      within(dialog).getByText(
        "Diese Daten gehen an Claude (Anthropic): dein Text, dein Foto, das Datum von heute, kg oder lb und die Liste der Workouts. Sonst nichts.",
      ),
    ).toBeInTheDocument();
    await sendMessage(user, "Fran 6:42");

    const chat = await within(dialog).findByRole("list", { name: "Gespräch" });
    expect(await within(chat).findByText("Rx oder Scaled?")).toBeInTheDocument();
    expect(within(dialog).getByText("ca. 1 US-Cent")).toBeInTheDocument();
    expect(within(dialog).getByText("2.100 Token")).toBeInTheDocument();

    await sendMessage(user, "Rx");
    const card = await within(dialog).findByRole("region", { name: "Dein Eintrag" });
    expect(within(card).getByText("6:42 · Rx")).toBeInTheDocument();
    expect(within(card).getByText("Pull-ups in 3 Sätzen")).toBeInTheDocument();

    // The second request has the full conversation and the same instructions.
    const [first, second] = ask.mock.calls.map(([request]) => request);
    expect(first?.messages).toEqual([{ role: "user", text: "Fran 6:42" }]);
    expect(second?.messages).toEqual([
      { role: "user", text: "Fran 6:42" },
      { role: "assistant", text: JSON.stringify(QUESTION) },
      { role: "user", text: "Rx" },
    ]);
    expect(second?.instructions).toBe(first?.instructions);
    expect(first?.instructions).toContain("fran · Fran · for time · thruster, pull-up");

    await user.click(within(card).getByRole("button", { name: "Ergebnis speichern" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // The app opens the workout with the new result.
    expect(screen.getByRole("heading", { name: "Fran", level: 2 })).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(savedData(folder).results).toMatchObject([
        { workoutId: "fran", score: { kind: "time", seconds: 402 }, notes: "Pull-ups in 3 Sätzen" },
      ]);
    });
  });

  it("creates a new workout with its result", async () => {
    const answer: AiAnswer = {
      status: "draft",
      message: "Dieses Workout kenne ich nicht. Ich lege es als eigenes Workout an.",
      draft: franDraft({
        workoutId: null,
        newWorkout: {
          name: "WOD Mittwoch",
          scoreType: "rounds-reps",
          timeCapMinutes: 12,
          rounds: null,
          parts: [{ exercise: "wall-ball", amount: 10, unit: "reps", kg: 9, boxInches: null }],
          notes: "",
        },
        division: "scaled",
        score: { ...NO_SCORE, rounds: 7, reps: 12 },
        loadKg: 6,
      }),
    };
    const { folder, user } = await openApp(fakeAsk(ok(answer)));
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    await sendMessage(user, "WOD vom Whiteboard");

    const card = await screen.findByRole("region", { name: "Dein Eintrag" });
    expect(within(card).getByText("Neues Workout")).toBeInTheDocument();
    expect(within(card).getByText("10 × Wall Ball, 9 kg")).toBeInTheDocument();
    expect(within(card).getByText("7 Runden + 12 Wdh. · Scaled")).toBeInTheDocument();
    expect(within(card).getByText("6 kg")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "Workout und Ergebnis speichern" }));
    expect(screen.getByRole("heading", { name: "WOD Mittwoch", level: 2 })).toBeInTheDocument();
    await vi.waitFor(() => {
      const saved = savedData(folder);
      expect(saved.workouts).toMatchObject([{ name: "WOD Mittwoch" }]);
      expect(saved.results).toMatchObject([{ workoutId: saved.workouts[0]?.id, loadKg: 6 }]);
    });
  });

  it("sends a photo and starts from an open workout", async () => {
    const ask = fakeAsk(ok(DRAFT));
    const { user } = await openApp(ask);
    await user.click(screen.getByRole("button", { name: /^Fran/ }));
    await user.click(screen.getByRole("button", { name: "Mit KI" }));
    const dialog = screen.getByRole("dialog", { name: "Mit KI eintragen" });
    expect(within(dialog).getByText(/kg oder lb und das Workout „Fran“/)).toBeVisible();

    // A computer has no camera button: there, it would open only the file dialog.
    expect(
      within(dialog).queryByRole("button", { name: "Foto aufnehmen" }),
    ).not.toBeInTheDocument();
    const photo = new File([new Uint8Array([1, 2, 3])], "whiteboard.png", { type: "image/png" });
    await user.upload(within(dialog).getByLabelText("Foto-Datei"), photo);
    expect(within(dialog).getByText("whiteboard.png")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Senden" }));

    await within(dialog).findByRole("region", { name: "Dein Eintrag" });
    const request = ask.mock.calls[0]?.[0];
    expect(request?.messages).toEqual([
      {
        role: "user",
        text: "Hier ist ein Foto.",
        images: [{ mediaType: "image/png", base64: "AQID" }],
      },
    ]);
    expect(request?.instructions).toContain('Use workoutId "fran"');
    // The chat shows the name of the photo.
    const chat = within(dialog).getByRole("list", { name: "Gespräch" });
    expect(within(chat).getByText("whiteboard.png")).toBeInTheDocument();
  });

  it("checks the input and the photo", async () => {
    const { user } = await openApp(fakeAsk());
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    const dialog = screen.getByRole("dialog", { name: "Mit KI eintragen" });

    await user.click(within(dialog).getByRole("button", { name: "Senden" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Schreib etwas, oder wähle ein Foto.",
    );

    const text = new File(["x"], "notes.txt", { type: "text/plain" });
    // The file dialog shows only images. But some systems let the user pick another file.
    const anyFile = userEvent.setup({ applyAccept: false });
    await anyFile.upload(within(dialog).getByLabelText("Foto-Datei"), text);
    expect(
      await within(dialog).findByText(
        "Die KI liest nur Bilder im Format JPEG, PNG, GIF oder WebP.",
      ),
    ).toHaveAttribute("role", "alert");

    const photo = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    await user.upload(within(dialog).getByLabelText("Foto-Datei"), photo);
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Foto entfernen" }));
    expect(within(dialog).queryByText("a.jpg")).not.toBeInTheDocument();
  });

  it("takes a photo with the camera on a phone", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(pointer: coarse)" }));
    const ask = fakeAsk(ok(DRAFT));
    const { user } = await openApp(ask);
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    const dialog = screen.getByRole("dialog", { name: "Mit KI eintragen" });

    expect(within(dialog).getByRole("button", { name: "Foto aufnehmen" })).toBeVisible();
    const photo = new File([new Uint8Array([7])], "kamera.jpg", { type: "image/jpeg" });
    await user.upload(within(dialog).getByLabelText("Kamera"), photo);
    expect(within(dialog).getByText("kamera.jpg")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Senden" }));

    await within(dialog).findByRole("region", { name: "Dein Eintrag" });
    expect(ask.mock.calls[0]?.[0].messages).toEqual([
      {
        role: "user",
        text: "Hier ist ein Foto.",
        images: [{ mediaType: "image/jpeg", base64: "Bw==" }],
      },
    ]);
  });

  it("sends a problem of a draft back to the AI and shows only the fixed draft", async () => {
    const wrong: AiAnswer = { ...DRAFT, draft: franDraft({ workoutId: "nope" }) };
    const ask = fakeAsk(ok(wrong), ok(DRAFT));
    const { user } = await openApp(ask);
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    await sendMessage(user, "Fran 6:42 Rx");

    await screen.findByRole("region", { name: "Dein Eintrag" });
    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[1]?.[0].messages.at(-1)?.text).toContain(
      'There is no workout with the id "nope"',
    );
    // The fix is not in the chat.
    const chat = screen.getByRole("list", { name: "Gespräch" });
    expect(within(chat).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("ca. 2 US-Cent")).toBeInTheDocument();
    expect(screen.getByText("4.200 Token")).toBeInTheDocument();
  });

  it("gives up after too many problems", async () => {
    const wrong = ok({ ...DRAFT, draft: franDraft({ date: "gestern" }) });
    const ask = fakeAsk(wrong, wrong, wrong);
    const { user } = await openApp(ask);
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    await sendMessage(user, "Fran gestern");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die KI hat keinen gültigen Eintrag geliefert.",
    );
    expect(ask).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("region", { name: "Dein Eintrag" })).not.toBeInTheDocument();
    // The chat does not show the message of the draft that the app cannot use.
    const chat = screen.getByRole("list", { name: "Gespräch" });
    expect(within(chat).getAllByRole("listitem")).toHaveLength(1);
  });

  it("sends a draft without data back to the AI", async () => {
    const empty: AiAnswer = { status: "draft", message: "Fertig.", draft: null };
    const ask = fakeAsk(ok(empty), ok(DRAFT));
    const { user } = await openApp(ask);
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    await sendMessage(user, "Fran 6:42 Rx");

    await screen.findByRole("region", { name: "Dein Eintrag" });
    expect(ask.mock.calls[1]?.[0].messages.at(-1)?.text).toContain("the draft is null");
  });

  it("keeps the draft when a correction fails, and sends with Ctrl+Enter", async () => {
    const { user } = await openApp(fakeAsk(ok(DRAFT), { kind: "rate-limit" }));
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    const dialog = screen.getByRole("dialog", { name: "Mit KI eintragen" });
    await user.type(within(dialog).getByRole("textbox"), "Fran 6:42 Rx{Control>}{Enter}{/Control}");
    await within(dialog).findByRole("region", { name: "Dein Eintrag" });

    await user.type(within(dialog).getByRole("textbox"), "Es war gestern{Meta>}{Enter}{/Meta}");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Zu viele Anfragen");
    expect(within(dialog).getByRole("region", { name: "Dein Eintrag" })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox")).toHaveValue("Es war gestern");
  });

  it("gives the message back after a failed request", async () => {
    const { user } = await openApp(fakeAsk({ kind: "offline" }));
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    await sendMessage(user, "Fran 6:42");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Keine Verbindung zur KI. Prüfe deine Internetverbindung.",
    );
    expect(screen.getByRole("textbox")).toHaveValue("Fran 6:42");
    expect(screen.queryByRole("list", { name: "Gespräch" })).not.toBeInTheDocument();
  });

  it("cancels a request", async () => {
    const ask = vi.fn(
      ({ signal }: AiRequest<AiAnswer>) =>
        new Promise<AiResult<AiAnswer>>((resolve) => {
          signal?.addEventListener("abort", () => {
            resolve({ kind: "canceled" });
          });
        }),
    );
    const { user } = await openApp(ask);
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));
    await sendMessage(user, "Fran 6:42");
    expect(screen.getByRole("status")).toHaveTextContent("Die KI liest …");

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(await screen.findByRole("textbox")).toHaveValue("Fran 6:42");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // A close of the dialog also cancels a running request.
    await sendMessage(user, " Rx");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(ask.mock.calls[1]?.[0].signal?.aborted).toBe(true);
  });

  it("shows a hint without AI setup", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const { user } = await openApp(undefined);
    await user.click(screen.getByRole("button", { name: "Mit KI eintragen" }));

    const dialog = screen.getByRole("dialog", { name: "Mit KI eintragen" });
    expect(
      await within(dialog).findByText(
        "Die KI trägt dein Ergebnis aus Text oder Foto ein. Dafür brauchst du einen eigenen API-Key von Claude oder OpenAI.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a broken AI settings file", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const folder = createMemoryFolder();
    folder.files.set("ai/ai.json", { text: "{kaputt", lastModified: 1 });
    const user = userEvent.setup();
    render(<App folderHost={createMemoryFolderHost({ saved: folder })} />);
    await user.click(await screen.findByRole("button", { name: "Mit KI eintragen" }));

    expect(await screen.findByText("Die Datei ist keine gültige JSON-Datei.")).toBeInTheDocument();
  });
});
