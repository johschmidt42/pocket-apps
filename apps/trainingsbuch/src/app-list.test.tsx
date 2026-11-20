import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import { card, chip, openApp, savedData, waitForSave } from "./test-app.tsx";

// These tests render the whole app with the list of all 359 workouts. See "Longer time limit for
// the tests of the whole trainingsbuch app" in docs/decisions.md.
vi.setConfig({ testTimeout: 15_000 });

describe("Trainingsbuch: the list of workouts", () => {
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
    expect(within(plan).getByText("Thruster, 95 lb")).toBeInTheDocument();
    await waitForSave();
    expect(savedData(folder).units).toBe("imperial");
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Einheiten" })).getByRole("radio", {
        name: "kg",
      }),
    );
    expect(within(plan).getByText("Thruster, 43 kg")).toBeInTheDocument();
  });

  it("shows the loads for women and keeps the choice in the data file", async () => {
    const { folder, user } = await openApp();
    await user.click(card("Fran"));
    const plan = screen.getByRole("region", { name: "Ablauf" });
    const loadsFor = within(screen.getByRole("radiogroup", { name: "Gewichte für" }));
    expect(loadsFor.getByRole("radio", { name: "Männer" })).toBeChecked();

    await user.click(loadsFor.getByRole("radio", { name: "Frauen" }));
    expect(within(plan).getByText("Thruster, 29 kg")).toBeInTheDocument();
    await waitForSave();
    expect(savedData(folder).loadsFor).toBe("women");
    // The two switches work together.
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Einheiten" })).getByRole("radio", {
        name: "lb",
      }),
    );
    expect(within(plan).getByText("Thruster, 65 lb")).toBeInTheDocument();
  });
});
