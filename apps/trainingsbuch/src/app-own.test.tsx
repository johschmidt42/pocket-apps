import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import { card, chip, FILE, fran, openApp, OWN, savedData, waitForSave } from "./test-app.tsx";

// These tests render the whole app with the list of all 359 workouts. See "Longer time limit for
// the tests of the whole trainingsbuch app" in docs/decisions.md.
vi.setConfig({ testTimeout: 15_000 });

describe("Trainingsbuch: own workouts", () => {
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
    expect(lines()).toEqual(["10 ×Box Jump, Boxhöhe fehlt"]);

    await user.click(screen.getByRole("button", { name: "Box Chipper bearbeiten" }));
    const dialog = screen.getByRole("dialog", { name: "Workout bearbeiten" });
    expect(within(dialog).getByLabelText("Box Männer (Zoll)")).toHaveValue("");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(
      within(dialog).getByText("Box Jump: Bitte die Boxhöhe in Zoll wählen."),
    ).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText("Box Männer (Zoll)"), "30");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(lines()).toEqual(["10 ×Box Jump, 30 Zoll"]);
    // One height for all: no switch for men and women.
    expect(screen.queryByRole("radiogroup", { name: "Gewichte für" })).not.toBeInTheDocument();

    // A height for women makes a pair, and the switch shows one of them.
    await user.click(screen.getByRole("button", { name: "Box Chipper bearbeiten" }));
    const again = screen.getByRole("dialog", { name: "Workout bearbeiten" });
    expect(within(again).getByLabelText("Box Frauen (Zoll)")).toHaveValue("");
    await user.selectOptions(within(again).getByLabelText("Box Frauen (Zoll)"), "24");
    // A new box exercise starts with 24 inches for men and 20 for women.
    await user.selectOptions(within(again).getByLabelText("Übung hinzufügen"), "box-step-over");
    expect(within(again).getAllByLabelText("Box Männer (Zoll)")[1]).toHaveValue("24");
    expect(within(again).getAllByLabelText("Box Frauen (Zoll)")[1]).toHaveValue("20");
    await user.click(within(again).getByRole("button", { name: "Box Step-over entfernen" }));
    await user.click(within(again).getByRole("button", { name: "Speichern" }));
    expect(lines()).toEqual(["10 ×Box Jump, 30 Zoll"]);
    const loadsFor = within(screen.getByRole("radiogroup", { name: "Gewichte für" }));
    await user.click(loadsFor.getByRole("radio", { name: "Frauen" }));
    expect(lines()).toEqual(["10 ×Box Jump, 24 Zoll"]);
    // Own workouts have no switch for kg and lb.
    expect(screen.queryByRole("radiogroup", { name: "Einheiten" })).not.toBeInTheDocument();
    await waitForSave();
    expect(savedData(folder).workouts[0]?.parts[0]).toMatchObject({
      boxInches: 30,
      boxInchesWomen: 24,
    });
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
    await user.type(within(dialog).getByLabelText("Männer (kg)"), "42,5");
    await user.type(within(dialog).getByLabelText("Frauen (kg)"), "29");
    await user.selectOptions(within(dialog).getByLabelText("Übung hinzufügen"), "row");
    expect(within(dialog).getByLabelText("Meter")).toHaveFocus();
    await user.selectOptions(within(dialog).getByLabelText("Einheit"), "cal");
    await user.type(within(dialog).getByLabelText("Kalorien"), "15,5");
    await user.selectOptions(within(dialog).getByLabelText("Übung hinzufügen"), "burpee");
    expect(within(dialog).getAllByLabelText("Männer (kg)")).toHaveLength(1);
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
    // A load for women shows the switch. It shows the loads for men first.
    expect(screen.getByRole("radiogroup", { name: "Gewichte für" })).toBeInTheDocument();
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
            kgWomen: null,
            boxInchesWomen: null,
          },
          {
            id: expect.any(String) as string,
            exercise: "thruster",
            amount: 21,
            unit: "reps",
            kg: 42.5,
            boxInches: null,
            kgWomen: 29,
            boxInchesWomen: null,
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
    expect(within(dialog).getByLabelText("Männer (kg)")).toHaveValue("9");
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
      loadsFor: "men",
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

  it("closes the workout dialog without a change", async () => {
    const { user } = await openApp();

    await user.click(screen.getByRole("button", { name: "Eigenes Workout" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
