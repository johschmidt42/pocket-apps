import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataFolderContext } from "../data-file/data-folder-context.ts";
import type { DataFolder } from "../data-file/folder.ts";
import { createMemoryFolder, type MemoryFolder } from "../data-file/testing.ts";
import { AI_FILE, writeAiSettings } from "./ai-file.ts";
import { AiSettingsDialog } from "./ai-settings-dialog.tsx";
import { readAiKeys, writeAiKeys } from "./ai-keys.ts";
import type { AiSettings } from "./settings.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const CLAUDE_MODELS = {
  data: [
    {
      type: "model",
      id: "claude-opus-5-5",
      display_name: "Claude Opus 5.5",
      created_at: "2026-10-01T00:00:00Z",
    },
    {
      type: "model",
      id: "claude-haiku-5-5",
      display_name: "Claude Haiku 5.5",
      created_at: "2026-09-01T00:00:00Z",
    },
  ],
  has_more: false,
};

const OPENAI_MODELS = (ids: string[]) => ({
  object: "list",
  data: ids.map((id, index) => ({ id, object: "model", created: index, owned_by: "openai" })),
});

/** The browser fetch answers each request with the next response. */
function answers(...responses: (() => Response)[]) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const response of responses) fetch.mockImplementationOnce(() => Promise.resolve(response()));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function savedSettings(folder: MemoryFolder): AiSettings {
  return (JSON.parse(folder.files.get(AI_FILE)?.text ?? "") as { data: AiSettings }).data;
}

function showDialog(folder: DataFolder | null) {
  const onClose = vi.fn();
  const user = userEvent.setup();
  const dialog = <AiSettingsDialog open onClose={onClose} />;
  render(
    folder ? (
      <DataFolderContext value={{ folder, appVersion: "3.4" }}>{dialog}</DataFolderContext>
    ) : (
      dialog
    ),
  );
  return { onClose, user };
}

function provider(name: string) {
  return within(screen.getByRole("radiogroup", { name: "Anbieter" })).getByRole("radio", { name });
}

describe("AiSettingsDialog", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  it("asks for the data folder first", () => {
    showDialog(null);

    expect(screen.getByText(/Wähle zuerst deinen Datenordner/)).toBeInTheDocument();
  });

  it("shows the loading and a broken file", async () => {
    const slow: DataFolder = { ...createMemoryFolder(), read: () => new Promise(() => undefined) };
    const { unmount } = render(
      <DataFolderContext value={{ folder: slow, appVersion: "1.0" }}>
        <AiSettingsDialog open onClose={vi.fn()} />
      </DataFolderContext>,
    );
    expect(screen.getByText("Lädt die KI-Einstellungen …")).toBeInTheDocument();
    unmount();

    const broken = createMemoryFolder();
    broken.files.set(AI_FILE, { text: "{nope", lastModified: 1 });
    showDialog(broken);
    expect(await screen.findByText("Die Datei ist keine gültige JSON-Datei.")).toBeInTheDocument();
  });

  it("checks a new Claude key, selects the model and saves the key only in the browser", async () => {
    const folder = createMemoryFolder();
    const { onClose, user } = showDialog(folder);
    await screen.findByLabelText("API-Key");
    expect(provider("Claude (Anthropic)")).toBeChecked();
    expect(screen.getByLabelText("Modell")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("Bitte gib einen API-Key ein.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("API-Key"), "sk-ant-neu");
    expect(screen.queryByText("Bitte gib einen API-Key ein.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("Bitte prüfe zuerst die Verbindung.")).toBeInTheDocument();

    let respond: (response: Response) => void = () => undefined;
    vi.stubGlobal("fetch", () => new Promise<Response>((resolve) => (respond = resolve)));
    await user.click(screen.getByRole("button", { name: "Verbindung prüfen" }));
    expect(screen.getByText("Prüft den Key …")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verbindung prüfen" })).toBeDisabled();
    respond(json(CLAUDE_MODELS));

    expect(
      await screen.findByText(/Der Key funktioniert\. 2 Modelle verfügbar\./),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Modell")).toHaveValue("claude-opus-5-5");
    expect(
      screen.getByRole("option", { name: "Claude Haiku 5.5 (claude-haiku-5-5)" }),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Modell"), "claude-haiku-5-5");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(savedSettings(folder)).toEqual({
      active: "anthropic",
      models: { anthropic: "claude-haiku-5-5", openai: null },
    });
    expect(folder.files.get(AI_FILE)?.text).not.toContain("sk-ant-neu");
    expect(await readAiKeys()).toEqual({ anthropic: "sk-ant-neu", openai: null });
  });

  it("drops the result of a check when the user changed the key meanwhile", async () => {
    const { user } = showDialog(createMemoryFolder());
    await user.type(await screen.findByLabelText("API-Key"), "sk-ant-alt");
    let respond: (response: Response) => void = () => undefined;
    vi.stubGlobal("fetch", () => new Promise<Response>((resolve) => (respond = resolve)));
    await user.click(screen.getByRole("button", { name: "Verbindung prüfen" }));
    await user.type(screen.getByLabelText("API-Key"), "-neu");

    respond(json(CLAUDE_MODELS));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByText(/Der Key funktioniert/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("Bitte prüfe zuerst die Verbindung.")).toBeInTheDocument();
  });

  it("checks an OpenAI key: a wrong key, one model, and no model", async () => {
    const folder = createMemoryFolder();
    const { user } = showDialog(folder);
    await user.click(await screen.findByRole("radio", { name: "OpenAI" }));
    // A click on the chosen provider does not clear the choice.
    await user.click(provider("OpenAI"));
    expect(provider("OpenAI")).toBeChecked();
    expect(screen.getByLabelText("API-Key")).toHaveAttribute("placeholder", "sk-…");

    await user.type(screen.getByLabelText("API-Key"), "sk-falsch");
    answers(() => json({ error: { message: "nope" } }, 401));
    await user.click(screen.getByRole("button", { name: "Verbindung prüfen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Der Key ist ungültig. Prüfe, ob du ihn vollständig kopiert hast.",
    );

    await user.clear(screen.getByLabelText("API-Key"));
    await user.type(screen.getByLabelText("API-Key"), "sk-gut");
    answers(() => json(OPENAI_MODELS(["gpt-a"])));
    await user.click(screen.getByRole("button", { name: "Verbindung prüfen" }));
    expect(await screen.findByText(/1 Modell verfügbar\./)).toBeInTheDocument();
    expect(screen.getByLabelText("Modell")).toHaveValue("gpt-a");

    // The model stays when the next check lists it again.
    answers(() => json(OPENAI_MODELS(["gpt-b", "gpt-a"])));
    await user.click(screen.getByRole("button", { name: "Verbindung prüfen" }));
    expect(await screen.findByText(/2 Modelle verfügbar\./)).toBeInTheDocument();
    expect(screen.getByLabelText("Modell")).toHaveValue("gpt-a");

    answers(() => json(OPENAI_MODELS([])));
    await user.click(screen.getByRole("button", { name: "Verbindung prüfen" }));
    expect(await screen.findByText(/0 Modelle verfügbar\./)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Keine Modelle verfügbar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("Bitte wähle ein Modell.")).toBeInTheDocument();
  });

  it("keeps a known key without a new check, shows it on request and removes it", async () => {
    const folder = createMemoryFolder();
    await writeAiSettings(
      folder,
      { active: "anthropic", models: { anthropic: "claude-opus-5-5", openai: null } },
      "1.0",
    );
    await writeAiKeys({ anthropic: "sk-ant-alt", openai: null });
    const fileBefore = folder.files.get(AI_FILE)?.text;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onClose, user } = showDialog(folder);

    expect(await screen.findByRole("radio", { name: "Claude (Anthropic) · aktiv" })).toBeChecked();
    expect(screen.getByLabelText("API-Key")).toHaveValue("sk-ant-alt");
    expect(screen.getByLabelText("API-Key")).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Key anzeigen" }));
    expect(screen.getByLabelText("API-Key")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Key verbergen" }));
    expect(screen.getByLabelText("API-Key")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Modell")).toHaveValue("claude-opus-5-5");
    expect(screen.getByText("Prüfe die Verbindung, um alle Modelle zu sehen.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Key entfernen" }));
    expect(confirm).toHaveBeenCalledWith("Key für Claude (Anthropic) in diesem Browser entfernen?");
    expect(onClose).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Key entfernen" }));
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(await readAiKeys()).toEqual({ anthropic: null, openai: null });
    // The file in the folder stays as it was. Other computers keep their keys.
    expect(folder.files.get(AI_FILE)?.text).toBe(fileBefore);
  });

  it("saves a known key without a check", async () => {
    const folder = createMemoryFolder();
    await writeAiSettings(
      folder,
      { active: "openai", models: { anthropic: null, openai: "gpt-a" } },
      "1.0",
    );
    await writeAiKeys({ anthropic: null, openai: "sk-alt" });
    const { onClose, user } = showDialog(folder);

    await user.click(await screen.findByRole("button", { name: "Speichern" }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("says when this computer has no key yet, and when saving fails", async () => {
    const folder = createMemoryFolder();
    await writeAiSettings(
      folder,
      { active: "anthropic", models: { anthropic: "claude-opus-5-5", openai: null } },
      "1.0",
    );
    const { user } = showDialog(folder);

    expect(
      await screen.findByText("Auf diesem Computer fehlt noch der Key für Claude (Anthropic)."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("API-Key"), "sk-ant-neu");
    answers(() => json(CLAUDE_MODELS));
    await user.click(screen.getByRole("button", { name: "Verbindung prüfen" }));
    await screen.findByText(/Der Key funktioniert/);
    await user.selectOptions(screen.getByLabelText("Modell"), "claude-haiku-5-5");
    folder.writeError = new Error("Datenträger voll");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(
      await screen.findByText(
        "Die App konnte die KI-Einstellungen nicht speichern: Datenträger voll",
      ),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    const { onClose, user } = showDialog(createMemoryFolder());
    await screen.findByLabelText("API-Key");

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
