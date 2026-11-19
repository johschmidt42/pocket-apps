import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { Logbook, OwnWorkout, Result } from "./schema.ts";

const FILE = "trainingsbuch/trainingsbuch.json";

const OWN: OwnWorkout = {
  id: "own1",
  name: "Montag Chipper",
  scoreType: "time-or-reps",
  timeCapMinutes: 12,
  rounds: null,
  parts: [
    { id: "p1", exercise: "wall-ball", amount: 50, unit: "reps", kg: 9, boxInches: null },
    { id: "p2", exercise: "burpee", amount: 50, unit: "reps", kg: null, boxInches: null },
  ],
  notes: "",
};

function fran(id: string, seconds: number, extra: Partial<Result> = {}): Result {
  return {
    id,
    workoutId: "fran",
    date: "2026-11-01",
    division: "rx",
    score: { kind: "time", seconds },
    loadKg: null,
    notes: "",
    ...extra,
  };
}

/** A data file of a test. Without `units`, the app uses its default (metric). */
type TestData = Omit<Logbook, "units"> & Partial<Pick<Logbook, "units">>;

async function openApp(data?: TestData) {
  const folder = createMemoryFolder();
  if (data) {
    folder.files.set(FILE, {
      text: JSON.stringify({
        app: "trainingsbuch",
        schemaVersion: 2,
        savedWith: "1.0",
        savedAt: "2026-11-17T12:00:00.000Z",
        data,
      }),
      lastModified: 1,
    });
  }
  const user = userEvent.setup();
  render(<App folderHost={createMemoryFolderHost({ saved: folder })} />);
  await screen.findByRole("tab", { name: "Workouts" });
  return { folder, user };
}

function savedData(folder: ReturnType<typeof createMemoryFolder>): Logbook {
  return (JSON.parse(folder.files.get(FILE)?.text ?? "") as { data: Logbook }).data;
}

async function waitForSave() {
  expect(await screen.findByText("Gespeichert", {}, { timeout: 2000 })).toBeInTheDocument();
}

/** The card of a workout. Its name says if the user did the workout. */
function card(name: string, done = false) {
  return screen.getByRole("button", {
    name: `${name} ${done ? "Gemacht" : "Noch nicht gemacht"}`,
  });
}

/** A chip of the filter "Kategorie" or "Status". */
function chip(filter: "Kategorie" | "Status", name: string) {
  return within(screen.getByRole("radiogroup", { name: filter })).getByRole("radio", { name });
}

describe("Trainingsbuch", () => {
  it("asks where the data lives", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Wo sollen deine Daten liegen?" }),
    ).toBeInTheDocument();
  });

  it("lists the built-in workouts as cards in sections and finds them by search", async () => {
    const { user } = await openApp();

    const girls = screen.getByRole("region", { name: "The Girls" });
    const fran = within(girls).getByRole("button", { name: "Fran Noch nicht gemacht" });
    expect(fran).toHaveAccessibleDescription(/^21-15-9 reps for time of/);
    expect(fran).toHaveAccessibleDescription(/Übungen: Thruster, Pull-up$/);
    expect(fran).toHaveTextContent("For Time");
    expect(screen.getByRole("region", { name: "Hero" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Open 2026" })).toBeInTheDocument();

    // The list has more than 350 cards: a query by label checks each element and is slow here.
    // A query by role finds the search field fast.
    await user.type(screen.getByRole("searchbox", { name: "Suchen" }), "thruster pull");
    expect(screen.getByRole("button", { name: "Fran Noch nicht gemacht" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Suchen" }), " zzz");
    expect(screen.getByText("Kein Workout passt zu „thruster pull zzz“.")).toBeInTheDocument();
  });

  it("filters the workouts by category", async () => {
    const { user } = await openApp();

    await user.click(chip("Kategorie", "Eigene"));
    expect(screen.queryByRole("region", { name: /The Girls/ })).not.toBeInTheDocument();
    expect(
      screen.getByText("Du hast noch kein eigenes Workout. Lege eins mit „Eigenes Workout“ an."),
    ).toBeInTheDocument();

    // A second click on the chosen chip does not clear the filter.
    await user.click(chip("Kategorie", "Eigene"));
    expect(chip("Kategorie", "Eigene")).toBeChecked();
    await user.click(chip("Kategorie", "Alle"));
    expect(screen.getByRole("region", { name: "The Girls" })).toBeInTheDocument();
  });

  it("shows the loads in lb and keeps the choice in the data file", async () => {
    const { folder, user } = await openApp();
    await user.click(card("Fran"));
    const plan = screen.getByRole("region", { name: "Ablauf" });

    await user.click(
      within(screen.getByRole("radiogroup", { name: "Einheiten" })).getByRole("radio", {
        name: "lb",
      }),
    );
    expect(within(plan).getByText("Thruster, 95/65 lb")).toBeInTheDocument();
    await waitForSave();
    expect(savedData(folder).units).toBe("imperial");
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Einheiten" })).getByRole("radio", {
        name: "kg",
      }),
    );
    expect(within(plan).getByText("Thruster, 43/29 kg")).toBeInTheDocument();
  });

  it("logs a time for Fran, saves it and shows it in the list and the history", async () => {
    const { folder, user } = await openApp();

    await user.click(card("Fran"));
    expect(screen.getByRole("heading", { level: 2, name: "Fran" })).toBeInTheDocument();
    // The plan: the heading, then each exercise with its amount in a column.
    const plan = screen.getByRole("region", { name: "Ablauf" });
    expect(within(plan).getByText("21-15-9")).toBeInTheDocument();
    expect(within(plan).getByText("reps for time of")).toBeInTheDocument();
    expect(
      within(within(plan).getAllByRole("list")[0]!)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Thruster, 43/29 kg", "Pull-up"]);

    expect(screen.getByText("Noch kein Ergebnis")).toBeInTheDocument();
    expect(screen.getByText("Noch kein Ergebnis. Trage dein erstes Ergebnis ein.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Ergebnis eintragen" }));
    const dialog = screen.getByRole("dialog", { name: "Ergebnis eintragen" });
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Bitte eine Zeit eingeben");

    await user.clear(within(dialog).getByLabelText("Datum"));
    await user.type(within(dialog).getByLabelText("Datum"), "2026-11-17");
    await user.selectOptions(within(dialog).getByLabelText("Rx / Scaled"), "scaled");
    await user.type(within(dialog).getByLabelText("Minuten"), "6");
    await user.type(within(dialog).getByLabelText("Sekunden"), "5");
    await user.type(within(dialog).getByLabelText("Gewicht in kg (optional)"), "schwer");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(within(dialog).getByText(/Bitte ein Gewicht in kg eingeben/)).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText("Gewicht in kg (optional)"));
    await user.type(within(dialog).getByLabelText("Gewicht in kg (optional)"), "30");
    await user.type(within(dialog).getByLabelText("Notizen (optional)"), "Pull-ups mit Band");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const best = screen.getByRole("complementary", { name: "Dein Bestwert" });
    expect(best).toHaveTextContent("6:05Scaled · 17.11.2026 · 1 Versuch");
    expect(screen.getByText("Di., 17.11.2026 · mit 30 kg")).toBeInTheDocument();
    expect(screen.getByText("Pull-ups mit Band")).toBeInTheDocument();
    await waitForSave();
    expect(savedData(folder).results).toEqual([
      {
        id: expect.any(String) as string,
        workoutId: "fran",
        date: "2026-11-17",
        division: "scaled",
        score: { kind: "time", seconds: 365 },
        loadKg: 30,
        notes: "Pull-ups mit Band",
      },
    ]);

    await user.click(screen.getByRole("button", { name: "Alle Workouts" }));
    expect(card("Fran", true)).toHaveTextContent("6:05Scaled1 Ergebnis");
  });

  it("counts the done workouts, filters them by status and opens one from the history", async () => {
    const { user } = await openApp({
      workouts: [],
      results: [fran("r1", 365, { division: "scaled" })],
    });

    // Each section shows how many of its workouts the user did.
    const girls = () => screen.getByRole("region", { name: "The Girls" });
    expect(girls()).toHaveTextContent("1 von 33 gemacht");
    expect(
      within(girls()).getByRole("progressbar", { name: "The Girls: gemachte Workouts" }),
    ).toBeInTheDocument();

    // The status filter shows the done or the open workouts.
    await user.click(chip("Status", "Gemacht"));
    expect(within(girls()).getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: /^Hero/ })).not.toBeInTheDocument();
    await user.click(chip("Status", "Offen"));
    expect(within(girls()).getAllByRole("button")).toHaveLength(32);
    expect(girls()).toHaveTextContent("1 von 33 gemacht");
    expect(screen.queryByRole("button", { name: /^Fran/ })).not.toBeInTheDocument();
    await user.click(chip("Status", "Offen"));
    expect(chip("Status", "Offen")).toBeChecked();
    await user.click(chip("Kategorie", "Eigene"));
    expect(
      screen.getByText("Hier gibt es kein offenes Workout. Du hast alle gemacht."),
    ).toBeInTheDocument();
    await user.click(chip("Status", "Gemacht"));
    expect(
      screen.getByText(
        "Hier hast du noch kein Workout gemacht. Trage ein Ergebnis ein, dann steht das Workout hier.",
      ),
    ).toBeInTheDocument();
    await user.click(chip("Status", "Alle"));
    await user.click(chip("Kategorie", "Alle"));

    await user.click(screen.getByRole("tab", { name: "Verlauf" }));
    await user.click(screen.getByRole("button", { name: /^Fran.*6:05/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Fran" })).toBeInTheDocument();
  });

  it("marks the best result, edits a result and removes it", async () => {
    const { folder, user } = await openApp({
      workouts: [],
      results: [fran("a", 300), fran("b", 280, { date: "2026-11-10" })],
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(card("Fran", true));
    const list = screen.getByRole("region", { name: "Deine Ergebnisse" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringMatching(/^4:40RxBestwert/) as string,
      expect.stringMatching(/^5:00Rx/) as string,
    ]);
    expect(screen.getByRole("region", { name: "Fortschritt" })).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Ergebnis vom So., 01.11.2026 bearbeiten" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Ergebnis bearbeiten" });
    expect(within(dialog).getByLabelText("Minuten")).toHaveValue("5");
    await user.clear(within(dialog).getByLabelText("Minuten"));
    await user.type(within(dialog).getByLabelText("Minuten"), "4");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(within(list).getByText("4:00")).toBeInTheDocument();

    const remove = screen.getByRole("button", { name: "Ergebnis vom So., 01.11.2026 löschen" });
    await user.click(remove);
    expect(within(list).getByText("4:00")).toBeInTheDocument();
    confirm.mockReturnValue(true);
    await user.click(remove);
    expect(within(list).queryByText("4:00")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Fortschritt" })).not.toBeInTheDocument();
    await waitForSave();
    expect(savedData(folder).results.map((result) => result.id)).toEqual(["b"]);
  });

  it("draws the progress with the score of each point", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 640,
      bottom: 400,
      width: 640,
      height: 400,
      toJSON: () => ({}),
    });
    const { user } = await openApp({
      workouts: [],
      results: [fran("a", 300, { division: "scaled" }), fran("b", 280, { date: "2026-11-10" })],
    });

    await user.click(card("Fran", true));

    const chart = screen.getByRole("region", { name: "Fortschritt" });
    expect(within(chart).getByText("10.11.26")).toBeInTheDocument();
    expect(within(chart).getByText("5:00")).toBeInTheDocument();
    expect(within(chart).getByText("4:40")).toBeInTheDocument();
    // The legend explains the points: filled for Rx, hollow for Scaled.
    expect(within(chart).getByText("Rx")).toBeInTheDocument();
    expect(within(chart).getByText("Scaled")).toBeInTheDocument();
  });

  it("asks for the box height in inches, also for a workout from before version 4", async () => {
    // A data file of schema version 1: its parts have no box height.
    const folder = createMemoryFolder();
    const part = { id: "p1", exercise: "box-jump", amount: 10, unit: "reps", kg: null };
    const workout = { ...OWN, name: "Box Chipper", parts: [part] };
    folder.files.set(FILE, {
      text: JSON.stringify({
        app: "trainingsbuch",
        schemaVersion: 1,
        savedWith: "3.1",
        savedAt: "2026-11-19T12:00:00.000Z",
        data: { workouts: [workout], results: [], units: "metric" },
      }),
      lastModified: 1,
    });
    const user = userEvent.setup();
    render(<App folderHost={createMemoryFolderHost({ saved: folder })} />);
    await user.click(await screen.findByRole("button", { name: /^Box Chipper/ }));
    const plan = screen.getByRole("region", { name: "Ablauf" });
    const lines = () =>
      within(within(plan).getAllByRole("list")[0]!)
        .getAllByRole("listitem")
        .map((item) => item.textContent);
    expect(lines()).toEqual(["10 ×Box Jump"]);

    await user.click(screen.getByRole("button", { name: "Box Chipper bearbeiten" }));
    const dialog = screen.getByRole("dialog", { name: "Workout bearbeiten" });
    expect(within(dialog).getByLabelText("Box (Zoll)")).toHaveValue("");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(
      within(dialog).getByText("Box Jump: Bitte die Boxhöhe in Zoll wählen."),
    ).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText("Box (Zoll)"), "30");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(lines()).toEqual(["10 ×Box Jump, 30 Zoll"]);

    // A new box exercise starts with 24 inches.
    await user.click(screen.getByRole("button", { name: "Box Chipper bearbeiten" }));
    const again = screen.getByRole("dialog", { name: "Workout bearbeiten" });
    await user.selectOptions(within(again).getByLabelText("Übung hinzufügen"), "box-step-over");
    expect(within(again).getAllByLabelText("Box (Zoll)")[1]).toHaveValue("24");
    await waitForSave();
    expect(savedData(folder).workouts[0]?.parts[0]?.boxInches).toBe(30);
  });

  it("adds an own workout with exercises, amounts and weights", async () => {
    const { folder, user } = await openApp();

    await user.click(screen.getByRole("button", { name: "Eigenes Workout" }));
    let dialog = screen.getByRole("dialog", { name: "Eigenes Workout" });
    await user.selectOptions(within(dialog).getByLabelText("Wertung nach"), "time-or-reps");
    await user.type(within(dialog).getByLabelText("Runden (optional)"), "x");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(within(dialog).getByText(/Bitte den Time Cap/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Bitte die Runden als ganze Zahl/)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Name (optional)"), "Montag Chipper");
    await user.type(within(dialog).getByLabelText("Time Cap in Minuten"), "12");
    await user.clear(within(dialog).getByLabelText("Runden (optional)"));
    await user.type(within(dialog).getByLabelText("Runden (optional)"), "3");

    // A new row asks for the amount, and for the weight if the exercise has one.
    await user.selectOptions(within(dialog).getByLabelText("Übung hinzufügen"), "thruster");
    expect(within(dialog).getByLabelText("Wiederholungen")).toHaveFocus();
    await user.keyboard("21");
    await user.type(within(dialog).getByLabelText("Gewicht (kg)"), "42,5");
    await user.selectOptions(within(dialog).getByLabelText("Übung hinzufügen"), "row");
    expect(within(dialog).getByLabelText("Meter")).toHaveFocus();
    await user.selectOptions(within(dialog).getByLabelText("Einheit"), "cal");
    await user.type(within(dialog).getByLabelText("Kalorien"), "15,5");
    await user.selectOptions(within(dialog).getByLabelText("Übung hinzufügen"), "burpee");
    expect(within(dialog).getAllByLabelText("Gewicht (kg)")).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "Burpee entfernen" }));

    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(
      within(dialog).getByText("Row: Bitte Kalorien als Zahl eingeben (ganze Zahl)."),
    ).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText("Kalorien"));
    await user.type(within(dialog).getByLabelText("Kalorien"), "15");

    // The arrow key on the grip moves the row.
    within(dialog).getByRole("button", { name: "Row verschieben" }).focus();
    await user.keyboard("{ArrowUp}");
    await user.type(within(dialog).getByLabelText("Notizen (optional)"), "Ohne Pause");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    expect(screen.getByRole("heading", { level: 2, name: "Montag Chipper" })).toBeInTheDocument();
    expect(screen.getByText(/Eigene · For Time · Cap 12 min/)).toBeInTheDocument();
    const plan = screen.getByRole("region", { name: "Ablauf" });
    expect(within(plan).getByText("3 Runden")).toBeInTheDocument();
    expect(
      within(within(plan).getAllByRole("list")[0]!)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["15 calRow", "21 ×Thruster, 42,5 kg"]);
    expect(within(plan).getByText("Ohne Pause")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ergebnis eintragen" }));
    dialog = screen.getByRole("dialog", { name: "Ergebnis eintragen" });
    await user.click(
      within(dialog).getByLabelText("Time Cap von 12 Minuten erreicht (nicht fertig)"),
    );
    expect(within(dialog).queryByLabelText("Minuten")).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Wiederholungen"), "87");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(screen.getAllByText("87 Wdh.")).toHaveLength(2);

    await waitForSave();
    const saved = savedData(folder);
    expect(saved.workouts).toEqual([
      {
        id: expect.any(String) as string,
        name: "Montag Chipper",
        scoreType: "time-or-reps",
        timeCapMinutes: 12,
        rounds: 3,
        parts: [
          {
            id: expect.any(String) as string,
            exercise: "row",
            amount: 15,
            unit: "cal",
            kg: null,
            boxInches: null,
          },
          {
            id: expect.any(String) as string,
            exercise: "thruster",
            amount: 21,
            unit: "reps",
            kg: 42.5,
            boxInches: null,
          },
        ],
        notes: "Ohne Pause",
      },
    ]);
    expect(saved.results[0]?.score).toEqual({ kind: "reps", reps: 87 });
  });

  it("gives an own workout a random name, without a name or with the dice", async () => {
    const { folder, user } = await openApp();

    await user.click(screen.getByRole("button", { name: "Eigenes Workout" }));
    let dialog = screen.getByRole("dialog", { name: "Eigenes Workout" });
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    const first = screen.getByRole("heading", { level: 2 }).textContent;
    expect(first).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);

    await user.click(screen.getByRole("button", { name: "Alle Workouts" }));
    await user.click(screen.getByRole("button", { name: "Eigenes Workout" }));
    dialog = screen.getByRole("dialog", { name: "Eigenes Workout" });
    await user.click(within(dialog).getByRole("button", { name: "Zufälligen Namen vorschlagen" }));
    const suggestion = within(dialog).getByLabelText<HTMLInputElement>("Name (optional)").value;
    expect(suggestion).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+( \d+)?$/);
    expect(suggestion).not.toBe(first);
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(screen.getByRole("heading", { level: 2, name: suggestion })).toBeInTheDocument();

    await waitForSave();
    expect(savedData(folder).workouts.map((workout) => workout.name)).toEqual([first, suggestion]);
  });

  it("adds an AMRAP with its length in minutes", async () => {
    const { user } = await openApp();

    await user.click(screen.getByRole("button", { name: "Eigenes Workout" }));
    const dialog = screen.getByRole("dialog", { name: "Eigenes Workout" });
    await user.type(within(dialog).getByLabelText("Name (optional)"), "Sommer-AMRAP");
    await user.selectOptions(within(dialog).getByLabelText("Wertung nach"), "load");
    expect(within(dialog).queryByLabelText(/Minuten/)).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText("Wertung nach"), "rounds-reps");
    expect(within(dialog).getByLabelText("Wertung nach")).toBeEnabled();
    await user.type(within(dialog).getByLabelText("Dauer in Minuten (optional)"), "0");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(within(dialog).getByText(/Bitte die Minuten als ganze Zahl/)).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText("Dauer in Minuten (optional)"));
    await user.type(within(dialog).getByLabelText("Dauer in Minuten (optional)"), "20");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    expect(screen.getByText(/Eigene · AMRAP 20 min/)).toBeInTheDocument();
  });

  it("edits and removes an own workout with its results", async () => {
    const { folder, user } = await openApp({
      workouts: [
        OWN,
        {
          ...OWN,
          id: "own2",
          name: "Leer",
          timeCapMinutes: null,
          scoreType: "time",
          parts: [],
        },
      ],
      results: [{ ...fran("r1", 100), workoutId: "own1" }, fran("r2", 200)],
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(chip("Kategorie", "Eigene"));
    await user.click(card("Montag Chipper", true));
    await user.click(screen.getByRole("button", { name: "Montag Chipper bearbeiten" }));
    const dialog = screen.getByRole("dialog", { name: "Workout bearbeiten" });
    expect(within(dialog).getByLabelText("Gewicht (kg)")).toHaveValue("9");
    // The workout has a result. Its score needs the same score type.
    expect(within(dialog).getByLabelText("Wertung nach")).toBeDisabled();
    expect(within(dialog).getByLabelText("Wertung nach")).toHaveAccessibleDescription(
      "Das Workout hat schon Ergebnisse. Darum bleibt die Wertung gleich.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Burpee entfernen" }));
    await user.clear(within(dialog).getByLabelText("Name (optional)"));
    await user.type(within(dialog).getByLabelText("Name (optional)"), "Dienstag");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(screen.getByRole("heading", { level: 2, name: "Dienstag" })).toBeInTheDocument();
    expect(screen.queryByText("Burpee")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dienstag löschen" }));
    expect(confirm).toHaveBeenLastCalledWith("„Dienstag“ und sein Ergebnis löschen?");
    expect(screen.getByRole("tab", { name: "Workouts" })).toBeInTheDocument();

    await user.click(card("Leer"));
    expect(screen.getByText("Kein Ablauf eingetragen.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Leer löschen" }));
    expect(confirm).toHaveBeenLastCalledWith("„Leer“ löschen?");

    await waitForSave();
    expect(savedData(folder)).toEqual({
      workouts: [],
      results: [fran("r2", 200)],
      units: "metric",
    });
  });

  it("asks before it removes an own workout with several results", async () => {
    const { user } = await openApp({
      workouts: [OWN],
      results: [
        { ...fran("r1", 100), workoutId: "own1" },
        { ...fran("r2", 90), workoutId: "own1" },
      ],
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(card("Montag Chipper", true));
    await user.click(screen.getByRole("button", { name: "Montag Chipper löschen" }));

    expect(confirm).toHaveBeenLastCalledWith("„Montag Chipper“ und seine 2 Ergebnisse löschen?");
    expect(screen.getByRole("heading", { level: 2, name: "Montag Chipper" })).toBeInTheDocument();
  });

  it("logs a result of an own workout without Rx or Scaled", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 640,
      bottom: 400,
      width: 640,
      height: 400,
      toJSON: () => ({}),
    });
    const { folder, user } = await openApp({
      workouts: [
        { ...OWN, id: "bike", name: "100 cal Bike", scoreType: "time", timeCapMinutes: null },
      ],
      results: [{ ...fran("old", 400, { division: null }), workoutId: "bike" }],
    });

    await user.click(card("100 cal Bike", true));
    await user.click(screen.getByRole("button", { name: "Ergebnis eintragen" }));
    const dialog = screen.getByRole("dialog", { name: "Ergebnis eintragen" });
    expect(within(dialog).getByLabelText("Rx / Scaled")).toHaveValue("");
    await user.type(within(dialog).getByLabelText("Minuten"), "6");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    const best = screen.getByRole("complementary", { name: "Dein Bestwert" });
    expect(best).toHaveTextContent("6:00");
    expect(best).not.toHaveTextContent("Rx");
    const list = screen.getByRole("region", { name: "Deine Ergebnisse" });
    expect(within(list).queryByText("Rx")).not.toBeInTheDocument();
    const chart = screen.getByRole("region", { name: "Fortschritt" });
    expect(within(chart).queryByText("Scaled")).not.toBeInTheDocument();
    await waitForSave();
    expect(savedData(folder).results.map((result) => result.division)).toEqual([null, null]);

    // An old result keeps its missing mark when you edit it.
    await user.click(
      screen.getByRole("button", { name: "Ergebnis vom So., 01.11.2026 bearbeiten" }),
    );
    expect(
      within(screen.getByRole("dialog", { name: "Ergebnis bearbeiten" })).getByLabelText(
        "Rx / Scaled",
      ),
    ).toHaveValue("");
  });

  it("logs rounds and reps, and a weight", async () => {
    const { user } = await openApp({
      workouts: [
        { ...OWN, id: "amrap", name: "AMRAP 20", scoreType: "rounds-reps", timeCapMinutes: null },
        { ...OWN, id: "max", name: "1RM Clean", scoreType: "load", timeCapMinutes: null },
      ],
      results: [],
    });

    await user.click(card("AMRAP 20"));
    await user.click(screen.getByRole("button", { name: "Ergebnis eintragen" }));
    let dialog = screen.getByRole("dialog", { name: "Ergebnis eintragen" });
    await user.type(within(dialog).getByLabelText("Runden"), "14");
    await user.type(within(dialog).getByLabelText("Extra-Wiederholungen"), "7");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(screen.getAllByText("14 Runden + 7 Wdh.")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Alle Workouts" }));
    await user.click(card("1RM Clean"));
    await user.click(screen.getByRole("button", { name: "Ergebnis eintragen" }));
    dialog = screen.getByRole("dialog", { name: "Ergebnis eintragen" });
    expect(within(dialog).queryByLabelText("Gewicht in kg (optional)")).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Gewicht in kg"), "82,5");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(screen.getAllByText("82,5 kg")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Ergebnis eintragen" }));
    expect(screen.getByRole("dialog", { name: "Ergebnis eintragen" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the history and a result of an unknown workout", async () => {
    const { user } = await openApp({
      workouts: [],
      results: [
        fran("a", 300, { notes: "gut" }),
        { ...fran("b", 99, { date: "2026-11-02" }), workoutId: "gone" },
      ],
    });

    await user.click(screen.getByRole("tab", { name: "Verlauf" }));
    const rows = screen.getAllByRole("button", { name: /Fran|Unbekanntes Workout/ });
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Unbekanntes Workout/) as string,
      expect.stringMatching(/^Fran.*gut/) as string,
    ]);
    expect(rows[0]).toBeDisabled();
  });

  it("opens a workout at its top and goes back to the same place in the list", async () => {
    const { user } = await openApp();
    document.documentElement.scrollTop = 900;

    await user.click(card("Barbara"));
    expect(document.documentElement.scrollTop).toBe(0);

    await user.click(screen.getByRole("button", { name: "Alle Workouts" }));
    await waitFor(() => {
      expect(document.documentElement.scrollTop).toBe(900);
    });
  });

  it("goes back to the list in the same tab with the back button of the browser", async () => {
    const { user } = await openApp({ workouts: [], results: [fran("r1", 300)] });
    await user.click(screen.getByRole("tab", { name: "Verlauf" }));
    await user.click(screen.getByRole("button", { name: /^Fran/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Fran" })).toBeVisible();
    expect(window.location.hash).toBe("#fran");

    act(() => {
      window.history.back();
    });
    expect(await screen.findByRole("tab", { name: "Verlauf" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(window.location.hash).toBe("");
  });

  it("shows the open workout again after a reload", async () => {
    window.history.replaceState(null, "", "/#fran");
    const user = userEvent.setup();
    render(<App folderHost={createMemoryFolderHost({ saved: createMemoryFolder() })} />);
    expect(await screen.findByRole("heading", { level: 2, name: "Fran" })).toBeVisible();

    // No entry of the app is before the workout. The button shows the list all the same.
    await user.click(screen.getByRole("button", { name: "Alle Workouts" }));
    expect(screen.getByRole("tab", { name: "Workouts" })).toBeVisible();
    expect(window.location.hash).toBe("");
  });

  it("shows the list for an unknown workout in the URL", async () => {
    window.history.replaceState(null, "", "/#gibt-es-nicht");
    await openApp();
    expect(screen.getByRole("tab", { name: "Workouts" })).toBeVisible();
  });

  it("says so when there are no results yet", async () => {
    const { user } = await openApp();

    await user.click(screen.getByRole("tab", { name: "Verlauf" }));

    expect(
      screen.getByText("Noch keine Ergebnisse. Wähle ein Workout und trage dein Ergebnis ein."),
    ).toBeInTheDocument();
  });

  it("closes the workout dialog without a change", async () => {
    const { user } = await openApp();

    await user.click(screen.getByRole("button", { name: "Eigenes Workout" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
