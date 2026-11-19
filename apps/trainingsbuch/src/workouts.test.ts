import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog.ts";
import type { Logbook, OwnWorkout, Result } from "./schema.ts";
import {
  allWorkouts,
  formatLabel,
  filterByStatus,
  fromOwn,
  groupWorkouts,
  newestFirst,
  newId,
  openYear,
  partLine,
  removeQuestion,
  removeResult,
  removeWorkout,
  resultsOf,
  searchWorkouts,
  upsertResult,
  upsertWorkout,
  type Workout,
} from "./workouts.ts";

const OWN: OwnWorkout = {
  id: "own1",
  name: "Montag 5 x 5",
  scoreType: "load",
  timeCapMinutes: null,
  rounds: 5,
  parts: [
    { id: "p1", exercise: "back-squat", amount: 5, unit: "reps", kg: 102.5, boxInches: null },
    { id: "p2", exercise: "row", amount: 500, unit: "m", kg: null, boxInches: null },
    { id: "p3", exercise: "back-squat", amount: null, unit: "reps", kg: null, boxInches: null },
  ],
  notes: "\n  steigern  ",
};

function result(id: string, workoutId: string, date: string): Result {
  return {
    id,
    workoutId,
    date,
    division: "rx",
    score: { kind: "reps", reps: 1 },
    loadKg: null,
    notes: "",
  };
}

function workout(id: string, name: string, category: Workout["category"]): Workout {
  return {
    id,
    name,
    category,
    scoreType: "time",
    timeCapMinutes: null,
    lines: [],
    exercises: [],
  };
}

describe("built-in catalog", () => {
  it("has unique IDs and names", () => {
    const ids = CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = CATALOG.map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has a prescription, exercises and a fitting time cap for each workout", () => {
    const ids = (list: readonly Workout[]) => list.map((item) => item.id);
    expect(ids(CATALOG.filter((item) => item.lines.length === 0))).toEqual([]);
    expect(ids(CATALOG.filter((item) => item.exercises.length === 0))).toEqual([]);
    expect(ids(CATALOG.filter((item) => item.category === "own"))).toEqual([]);
    expect(
      ids(
        CATALOG.filter((item) => item.scoreType === "time-or-reps" && item.timeCapMinutes === null),
      ),
    ).toEqual([]);
  });

  it("never names the trademark", () => {
    const text = JSON.stringify(CATALOG).toLowerCase();
    expect(text).not.toContain("crossfit");
  });

  it("names each Open workout with its year", () => {
    const open = CATALOG.filter((item) => item.category === "open");
    expect(open.filter((item) => openYear(item) === null)).toEqual([]);
    expect(new Set(open.map(openYear))).toEqual(
      new Set(Array.from({ length: 16 }, (_, index) => 2011 + index)),
    );
  });
});

describe("workouts", () => {
  it("joins built-in and own workouts", () => {
    const data: Logbook = { workouts: [OWN], results: [], units: "metric" };
    const all = allWorkouts(data);
    expect(all).toHaveLength(CATALOG.length + 1);
    expect(all.at(-1)).toEqual({
      id: "own1",
      name: "Montag 5 x 5",
      category: "own",
      scoreType: "load",
      timeCapMinutes: null,
      lines: ["5 Runden:", "5 × Back Squat, 102,5 kg", "500 m Row", "Back Squat"],
      notes: ["steigern"],
      exercises: ["back-squat", "row"],
    });
    expect(fromOwn({ ...OWN, rounds: null, parts: [], notes: "" }).lines).toEqual([]);
  });

  it("finds workouts by name, prescription and exercise", () => {
    const fran = CATALOG.find((item) => item.id === "fran");
    expect(fran).toBeDefined();
    const list = [fran!, fromOwn(OWN)];
    expect(searchWorkouts(list, "")).toEqual(list);
    expect(searchWorkouts(list, "FRAN")).toEqual([fran]);
    expect(searchWorkouts(list, "thruster pull")).toEqual([fran]);
    expect(searchWorkouts(list, "steigern").map((item) => item.id)).toEqual(["own1"]);
    expect(searchWorkouts(list, "back squat").map((item) => item.id)).toEqual(["own1"]);
    expect(searchWorkouts(list, "row").map((item) => item.id)).toEqual(["own1"]);
    expect(searchWorkouts(list, "kettlebell")).toEqual([]);
  });

  it("groups the list, with one section per Open year", () => {
    const groups = groupWorkouts([
      workout("a", "Open 23.1", "open"),
      workout("b", "Fran", "girls"),
      workout("c", "Open 24.2", "open"),
      workout("d", "Mein WOD", "own"),
      workout("e", "Murph", "hero"),
      workout("f", "Open 24.1", "open"),
      workout("g", "Open Special", "open"),
    ]);
    expect(groups.map((group) => [group.title, group.workouts.map((item) => item.id)])).toEqual([
      ["The Girls", ["b"]],
      ["Hero", ["e"]],
      ["Open 2024", ["c", "f"]],
      ["Open 2023", ["a"]],
      ["Open", ["g"]],
      ["Eigene", ["d"]],
    ]);
    expect(groupWorkouts([])).toEqual([]);
  });
});

describe("changes", () => {
  it("adds, replaces and removes results", () => {
    let data: Logbook = { workouts: [], results: [], units: "metric" };
    data = upsertResult(data, result("r1", "fran", "2026-11-01"));
    data = upsertResult(data, result("r2", "fran", "2026-11-03"));
    data = upsertResult(data, { ...result("r1", "fran", "2026-11-01"), notes: "neu" });
    expect(data.results.map((item) => [item.id, item.notes])).toEqual([
      ["r1", "neu"],
      ["r2", ""],
    ]);
    expect(resultsOf(data, "fran").map((item) => item.id)).toEqual(["r2", "r1"]);
    expect(removeResult(data, "r1").results.map((item) => item.id)).toEqual(["r2"]);
  });

  it("sorts newest first, and the later entry first on the same day", () => {
    const list = [
      result("a", "x", "2026-11-01"),
      result("b", "x", "2026-11-05"),
      result("c", "x", "2026-11-01"),
    ];
    expect(newestFirst(list).map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("adds, replaces and removes own workouts with their results", () => {
    let data: Logbook = {
      workouts: [],
      results: [result("r1", "own1", "2026-11-01")],
      units: "metric",
    };
    data = upsertWorkout(data, OWN);
    data = upsertWorkout(data, { ...OWN, name: "Dienstag" });
    data = upsertResult(data, result("r2", "fran", "2026-11-02"));
    expect(data.workouts.map((item) => item.name)).toEqual(["Dienstag"]);
    expect(removeWorkout(data, "own1")).toEqual({
      workouts: [],
      results: [result("r2", "fran", "2026-11-02")],
      units: "metric",
    });
  });

  it("makes random hex IDs", () => {
    expect(newId()).toMatch(/^[0-9a-f]{16}$/);
    expect(newId()).not.toBe(newId());
  });
});

describe("text for the screens", () => {
  it("writes a part as one line", () => {
    const part = { id: "p", amount: null, kg: null, boxInches: null } as const;
    expect(partLine({ ...part, exercise: "bike", unit: "cal", amount: 20 })).toBe("20 cal Bike");
    expect(partLine({ ...part, exercise: "l-sit", unit: "s", amount: 30 })).toBe("30 s L-Sit");
    expect(
      partLine({ ...part, exercise: "thruster", unit: "reps", kg: 42.5, boxInches: null }),
    ).toBe("Thruster, 42,5 kg");
    expect(
      partLine({ ...part, exercise: "box-jump", unit: "reps", amount: 10, boxInches: 30 }),
    ).toBe("10 × Box Jump, 30 Zoll");
    expect(
      partLine({ ...part, exercise: "step-up", unit: "reps", amount: 50, kg: 20, boxInches: 20 }),
    ).toBe("50 × Step-up, 20 kg, 20 Zoll");
    // Data from before schema version 2 has no box height.
    expect(partLine({ ...part, exercise: "box-jump", unit: "reps", amount: 10 })).toBe(
      "10 × Box Jump, Boxhöhe fehlt",
    );
  });

  it("names the format of a workout", () => {
    const base = workout("x", "X", "own");
    expect(formatLabel(base)).toBe("For Time");
    expect(formatLabel({ ...base, scoreType: "time-or-reps", timeCapMinutes: 12 })).toBe(
      "For Time · Cap 12 min",
    );
    expect(formatLabel({ ...base, scoreType: "time-or-reps" })).toBe("For Time");
    expect(formatLabel({ ...base, scoreType: "rounds-reps" })).toBe("AMRAP");
    expect(formatLabel({ ...base, scoreType: "rounds-reps", timeCapMinutes: 20 })).toBe(
      "AMRAP 20 min",
    );
    expect(formatLabel({ ...base, scoreType: "reps" })).toBe("Max. Wiederholungen");
    expect(formatLabel({ ...base, scoreType: "reps", timeCapMinutes: 7 })).toBe(
      "Max. Wiederholungen · 7 min",
    );
    expect(formatLabel({ ...base, scoreType: "load" })).toBe("Max. Gewicht");
  });

  it("asks before it removes an own workout", () => {
    expect(removeQuestion("Leer", 0)).toBe("„Leer“ löschen?");
    expect(removeQuestion("Montag", 1)).toBe("„Montag“ und sein Ergebnis löschen?");
    expect(removeQuestion("Montag", 3)).toBe("„Montag“ und seine 3 Ergebnisse löschen?");
  });

  it("filters the done and the open workouts", () => {
    const list = [workout("a", "A", "own"), workout("b", "B", "own"), workout("c", "C", "own")];
    const results = [
      result("1", "a", "2026-11-01"),
      result("2", "a", "2026-11-05"),
      result("3", "c", "2026-10-01"),
      result("4", "gone", "2026-11-06"),
    ];
    const ids = (status: "all" | "done" | "open") =>
      filterByStatus(list, results, status).map((item) => item.id);
    expect(ids("all")).toEqual(["a", "b", "c"]);
    expect(ids("done")).toEqual(["a", "c"]);
    expect(ids("open")).toEqual(["b"]);
  });
});
