import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { schema } from "./schema.ts";

const RESULT = {
  id: "r1",
  workoutId: "fran",
  date: "2026-11-17",
  division: "rx",
  score: { kind: "time", seconds: 245 },
  loadKg: null,
  notes: "",
};

const OWN = {
  id: "w1",
  name: "Montag",
  scoreType: "time-or-reps",
  timeCapMinutes: 12,
  rounds: 3,
  parts: [{ id: "p1", exercise: "thruster", amount: 21, unit: "reps", kg: 42.5 }],
  notes: "",
};

describe("trainingsbuch schema", () => {
  it("starts at version 1 with an empty logbook", () => {
    expect(currentVersion(schema)).toBe(1);
    expect(schema.initial()).toEqual({ workouts: [], results: [], units: "metric" });
  });

  it("accepts results and own workouts", () => {
    const data = {
      workouts: [OWN],
      results: [
        RESULT,
        { ...RESULT, id: "r2", division: "scaled", loadKg: 30, notes: "Band" },
        { ...RESULT, id: "r6", division: null },
        { ...RESULT, id: "r3", score: { kind: "rounds-reps", rounds: 20, reps: 3 } },
        { ...RESULT, id: "r4", score: { kind: "load", kg: 102.5 } },
        { ...RESULT, id: "r5", score: { kind: "reps", reps: 0 } },
      ],
    };
    // A file without `units` gets the default: metric.
    expect(schema.validate.parse(data)).toEqual({ ...data, units: "metric" });
    expect(schema.validate.parse({ ...data, units: "imperial" }).units).toBe("imperial");
    expect(schema.validate.safeParse({ ...data, units: "stone" }).success).toBe(false);
  });

  it("rejects a wrong score, division or exercise", () => {
    const bad = [
      { ...RESULT, score: { kind: "time", seconds: 0 } },
      { ...RESULT, score: { kind: "points", points: 3 } },
      { ...RESULT, division: "elite" },
      { ...RESULT, date: "17.11.2026" },
    ];
    for (const result of bad) {
      expect(schema.validate.safeParse({ workouts: [], results: [result] }).success).toBe(false);
    }
    expect(
      schema.validate.safeParse({
        workouts: [{ ...OWN, parts: [{ ...OWN.parts[0], exercise: "juggling" }] }],
        results: [],
      }).success,
    ).toBe(false);
    expect(
      schema.validate.safeParse({
        workouts: [{ ...OWN, parts: [{ ...OWN.parts[0], unit: "kg" }] }],
        results: [],
      }).success,
    ).toBe(false);
  });
});
