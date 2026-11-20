import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { card, chip, fran, openApp, OWN, savedData, waitForSave } from "./test-app.tsx";

// These tests render the whole app with the list of all 359 workouts. See "Longer time limit for
// the tests of the whole trainingsbuch app" in docs/decisions.md.
vi.setConfig({ testTimeout: 15_000 });

describe("Trainingsbuch: results", () => {
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
    ).toEqual(["Thruster, 43 kg", "Pull-up"]);

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

  it("says so when there are no results yet", async () => {
    const { user } = await openApp();

    await user.click(screen.getByRole("tab", { name: "Verlauf" }));

    expect(
      screen.getByText("Noch keine Ergebnisse. Wähle ein Workout und trage dein Ergebnis ein."),
    ).toBeInTheDocument();
  });
});
