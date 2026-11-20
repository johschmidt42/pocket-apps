// Shared helpers for the tests of the whole trainingsbuch app (app-*.test.tsx).
import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";
import { z } from "zod";
import { App } from "./app.tsx";
import { schema, type Logbook, type OwnWorkout, type Result } from "./schema.ts";

export const FILE = "trainingsbuch/trainingsbuch.json";

export const OWN: OwnWorkout = {
  id: "own1",
  name: "Montag Chipper",
  scoreType: "time-or-reps",
  timeCapMinutes: 12,
  rounds: null,
  parts: [
    {
      id: "p1",
      exercise: "wall-ball",
      amount: 50,
      unit: "reps",
      kg: 9,
      boxInches: null,
      kgWomen: null,
      boxInchesWomen: null,
    },
    {
      id: "p2",
      exercise: "burpee",
      amount: 50,
      unit: "reps",
      kg: null,
      boxInches: null,
      kgWomen: null,
      boxInchesWomen: null,
    },
  ],
  notes: "",
};

/** A result for Fran with a time in seconds. */
export function fran(id: string, seconds: number, extra: Partial<Result> = {}): Result {
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

/** A data file of a test. Without `units` and `loadsFor`: metric, loads for men. */
type TestData = Omit<Logbook, "units" | "loadsFor"> & Partial<Pick<Logbook, "units" | "loadsFor">>;

/** Opens the app with a data folder. With `data`, the folder has a data file first. */
export async function openApp(data?: TestData) {
  const folder = createMemoryFolder();
  if (data) {
    folder.files.set(FILE, {
      text: JSON.stringify({
        app: "trainingsbuch",
        schemaVersion: 3,
        savedWith: "1.0",
        savedAt: "2026-11-17T12:00:00.000Z",
        data: { loadsFor: "men", ...data },
      }),
      lastModified: 1,
    });
  }
  const user = userEvent.setup();
  render(<App folderHost={createMemoryFolderHost({ saved: folder })} />);
  await screen.findByRole("tab", { name: "Workouts" });
  return { folder, user };
}

const savedFileSchema = z.object({ data: z.unknown() });

/** The data in the data file. It must match the schema of the app. */
export function savedData(folder: ReturnType<typeof createMemoryFolder>): Logbook {
  const text: unknown = JSON.parse(folder.files.get(FILE)?.text ?? "");
  return schema.validate.parse(savedFileSchema.parse(text).data);
}

/** Waits for the status "Gespeichert". */
export async function waitForSave() {
  expect(await screen.findByText("Gespeichert", {}, { timeout: 2000 })).toBeInTheDocument();
}

/** The card of a workout. Its name says if the user did the workout. */
export function card(name: string, done = false) {
  return screen.getByRole("button", {
    name: `${name} ${done ? "Gemacht" : "Noch nicht gemacht"}`,
  });
}

/** A chip of the filter "Kategorie" or "Status". */
export function chip(filter: "Kategorie" | "Status", name: string) {
  return within(screen.getByRole("radiogroup", { name: filter })).getByRole("radio", { name });
}
