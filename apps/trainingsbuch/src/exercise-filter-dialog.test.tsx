import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";
import { CATALOG } from "./catalog.ts";
import { filterByExercises } from "./exercise-filter.ts";
import { searchWorkouts } from "./workouts.ts";

const ALL = CATALOG.length;

async function openApp() {
  render(<App folderHost={createMemoryFolderHost({ saved: createMemoryFolder() })} />);
  await screen.findByRole("tab", { name: "Workouts" });
  return userEvent.setup();
}

/** The line with the number of workouts in the list. */
function countLine() {
  return screen.getByText(/^\d+( von \d+)? Workouts$/);
}

/** The chip of an exercise in the dialog. Its name says the number of workouts and the choice. */
function chip(dialog: HTMLElement, exercise: string) {
  return within(dialog).getByRole("button", { name: new RegExp(`^${exercise}, \\d+ Workouts?`) });
}

/** The mode switch of the dialog: "Include" or "Exclude". */
function mode(dialog: HTMLElement, name: "Include" | "Exclude") {
  return within(within(dialog).getByRole("radiogroup", { name: "Modus" })).getByRole("radio", {
    name: new RegExp(`^${name}`),
  });
}

describe("exercise filter", () => {
  it("shows the number of workouts, also for a search", async () => {
    const user = await openApp();
    expect(countLine()).toHaveTextContent(`${String(ALL)} Workouts`);

    await user.type(screen.getByRole("searchbox", { name: "Suchen" }), "thruster");
    const found = searchWorkouts(CATALOG, "thruster").length;
    expect(countLine()).toHaveTextContent(`${String(found)} von ${String(ALL)} Workouts`);
  });

  it("filters the list by exercises with and without, and removes them again", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Übungen" }));
    const dialog = screen.getByRole("dialog", { name: "Übungen" });

    // The search of the dialog finds an exercise. Each exercise shows its number of workouts.
    await user.type(within(dialog).getByRole("searchbox", { name: "Übung suchen" }), "thrus");
    const thrusters = filterByExercises(CATALOG, { with: ["thruster"], without: [] }).length;
    expect(chip(dialog, "Thruster")).toHaveAccessibleName(
      `Thruster, ${String(thrusters)} Workouts`,
    );
    expect(mode(dialog, "Include")).toBeChecked();
    await user.click(chip(dialog, "Thruster"));
    expect(chip(dialog, "Thruster")).toHaveAccessibleName(/: Include$/);
    expect(chip(dialog, "Thruster")).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      `${String(thrusters)} Workouts passen`,
    );

    await user.clear(within(dialog).getByRole("searchbox", { name: "Übung suchen" }));
    await user.type(within(dialog).getByRole("searchbox", { name: "Übung suchen" }), "row");
    // "Ohne" and then "Mit" moves the exercise to "Mit".
    // In the mode "Exclude", a tap excludes the exercise.
    await user.click(mode(dialog, "Exclude"));
    await user.click(chip(dialog, "Row"));
    expect(chip(dialog, "Row")).toHaveAccessibleName(/^Row, \d+ Workouts: Exclude$/);
    expect(within(dialog).getByRole("status")).toHaveTextContent(/^Row: Exclude\. /);
    expect(mode(dialog, "Exclude")).toHaveAccessibleName("Exclude, 1 gewählt");
    const match = filterByExercises(CATALOG, { with: ["thruster"], without: ["row"] }).length;
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      `${String(match)} Workouts passen`,
    );
    await user.click(within(dialog).getByRole("button", { name: "Anzeigen" }));

    // The list shows the chosen exercises as chips and the number of workouts.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Übungen, 2 gewählt" })).toBeInTheDocument();
    expect(countLine()).toHaveTextContent(`${String(match)} von ${String(ALL)} Workouts`);
    const chips = screen.getByRole("list", { name: "Gewählte Übungen" });
    expect(
      within(chips)
        .getAllByRole("button")
        .map((chip) => chip.getAttribute("aria-label")),
    ).toEqual(["Thruster (Include) entfernen", "Row (Exclude) entfernen"]);

    await user.click(within(chips).getByRole("button", { name: "Row (Exclude) entfernen" }));
    expect(countLine()).toHaveTextContent(`${String(thrusters)} von ${String(ALL)} Workouts`);
    // The removed chip had the focus. Now the button of the picker has it.
    expect(screen.getByRole("button", { name: "Übungen, 1 gewählt" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Alle entfernen" })).not.toBeInTheDocument();

    // A click on the chosen button in the dialog makes the exercise neutral again.
    await user.click(screen.getByRole("button", { name: "Übungen, 1 gewählt" }));
    const again = screen.getByRole("dialog", { name: "Übungen" });
    const search = within(again).getByRole("searchbox", { name: "Übung suchen" });
    expect(search).toHaveValue("");
    // The dialog has the focus, not the search: on a phone, the keyboard would cover the list.
    expect(search).not.toHaveFocus();
    expect(again).toHaveFocus();
    // The mode starts at "Include". A second tap removes the exercise.
    expect(mode(again, "Include")).toBeChecked();
    await user.click(chip(again, "Thruster"));
    expect(chip(again, "Thruster")).toHaveAccessibleName(/^Thruster, \d+ Workouts$/);
    expect(within(again).getByRole("status")).toHaveTextContent(/^Thruster: entfernt\. /);
    expect(within(again).getByRole("button", { name: "Zurücksetzen" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(countLine()).toHaveTextContent(`${String(ALL)} Workouts`);
    expect(screen.queryByRole("list", { name: "Gewählte Übungen" })).not.toBeInTheDocument();
  });

  it("says in the dialog when no exercise or no workout matches", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Übungen" }));
    const dialog = screen.getByRole("dialog", { name: "Übungen" });
    const search = within(dialog).getByRole("searchbox", { name: "Übung suchen" });

    await user.type(search, "zzz");
    expect(within(dialog).getByText("Keine Übung passt zu „zzz“.")).toBeInTheDocument();
    await chooseBoth(user, dialog);
    expect(within(dialog).getByRole("status")).toHaveTextContent("0 Workouts passen");

    await user.click(within(dialog).getByRole("button", { name: "Zurücksetzen" }));
    expect(within(dialog).getByRole("status")).toHaveTextContent(`${String(ALL)} Workouts passen`);
  });

  it("counts the exercises of the workouts that match the other filters", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("radio", { name: "The Girls" }));
    await user.click(screen.getByRole("button", { name: "Übungen" }));
    const dialog = screen.getByRole("dialog", { name: "Übungen" });

    await user.type(within(dialog).getByRole("searchbox", { name: "Übung suchen" }), "thruster");
    const girls = CATALOG.filter((item) => item.category === "girls");
    const thrusters = filterByExercises(girls, { with: ["thruster"], without: [] }).length;
    expect(chip(dialog, "Thruster")).toHaveAccessibleName(
      `Thruster, ${String(thrusters)} Workouts`,
    );
    // A tap in the mode "Exclude" moves an included exercise to "Exclude".
    await user.click(chip(dialog, "Thruster"));
    await user.click(mode(dialog, "Exclude"));
    expect(chip(dialog, "Thruster")).toHaveAttribute("aria-pressed", "false");
    await user.click(chip(dialog, "Thruster"));
    expect(chip(dialog, "Thruster")).toHaveAccessibleName(/: Exclude$/);
    // A click on the chosen mode keeps it.
    await user.click(mode(dialog, "Exclude"));
    expect(mode(dialog, "Exclude")).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Anzeigen" }));

    // An empty list says that more than the exercises filter it.
    await user.type(screen.getByRole("searchbox", { name: "Suchen" }), "fran");
    expect(
      screen.getByText("Kein Workout passt zu deinen Übungen und Filtern."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Übungsfilter zurücksetzen" }));
    expect(screen.getByRole("button", { name: "Übungen" })).toHaveFocus();
  });

  it("says in the list when no workout matches, and resets the filter", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Übungen" }));
    await chooseBoth(user, screen.getByRole("dialog", { name: "Übungen" }));
    await user.keyboard("{Escape}");

    expect(screen.getByText("Kein Workout passt zu deinen Übungen.")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Suchen" }), "fran");
    expect(
      screen.getByText("Kein Workout passt zu „fran“ und deinen Übungen."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Übungsfilter zurücksetzen" }));
    expect(screen.getByRole("button", { name: /^Fran/ })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Gewählte Übungen" })).not.toBeInTheDocument();
  });

  it("removes all chosen exercises at once", async () => {
    const user = await openApp();
    await user.click(screen.getByRole("button", { name: "Übungen" }));
    await chooseBoth(user, screen.getByRole("dialog", { name: "Übungen" }));
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Alle entfernen" }));
    expect(countLine()).toHaveTextContent(`${String(ALL)} Workouts`);
  });
});

/** Chooses two exercises that no workout has together: Swim and Wall Ball. */
async function chooseBoth(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  expect(filterByExercises(CATALOG, { with: ["swim", "wall-ball"], without: [] })).toEqual([]);
  const search = within(dialog).getByRole("searchbox", { name: "Übung suchen" });
  await user.clear(search);
  await user.type(search, "swim");
  await user.click(chip(dialog, "Swim"));
  await user.clear(search);
  await user.type(search, "wall ball");
  await user.click(chip(dialog, "Wall Ball"));
}
