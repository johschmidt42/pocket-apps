import { describe, expect, it } from "vitest";
import { toV2 } from "./to-v2.ts";

/** Data of schema version 1: an own workout with a box jump, and a result. */
const V1_DATA = {
  workouts: [
    {
      id: "07889edad7dfa19b",
      name: "Box Jump Barbell Chipper",
      scoreType: "time",
      timeCapMinutes: null,
      rounds: null,
      parts: [
        { id: "p1", exercise: "box-jump", amount: 10, unit: "reps", kg: null },
        { id: "p2", exercise: "deadlift", amount: 50, unit: "reps", kg: 52.5 },
      ],
      notes: "Boxhöhe Rx 30/24 Zoll",
    },
  ],
  results: [
    {
      id: "r1",
      workoutId: "fran",
      date: "2026-11-17",
      division: "rx",
      score: { kind: "time", seconds: 402 },
      loadKg: null,
      notes: "",
    },
  ],
  units: "metric",
};

describe("toV2", () => {
  it("adds an empty box height to each part and keeps all other data", () => {
    expect(toV2(V1_DATA)).toEqual({
      ...V1_DATA,
      workouts: [
        {
          ...V1_DATA.workouts[0],
          parts: [
            { id: "p1", exercise: "box-jump", amount: 10, unit: "reps", kg: null, boxInches: null },
            { id: "p2", exercise: "deadlift", amount: 50, unit: "reps", kg: 52.5, boxInches: null },
          ],
        },
      ],
    });
  });

  it("refuses data of another shape", () => {
    expect(() => toV2({ workouts: "none" })).toThrow();
  });
});
