import { describe, expect, it } from "vitest";
import { toV3 } from "./to-v3.ts";

/** Data of schema version 2: an own workout with a box height, a result and the unit system. */
const V2_DATA = {
  workouts: [
    {
      id: "own1",
      name: "Box Chipper",
      scoreType: "time",
      timeCapMinutes: null,
      rounds: null,
      parts: [
        { id: "p1", exercise: "box-jump", amount: 10, unit: "reps", kg: null, boxInches: 30 },
      ],
      notes: "",
    },
  ],
  results: [
    {
      id: "r1",
      workoutId: "own1",
      date: "2026-11-19",
      division: "scaled",
      score: { kind: "time", seconds: 960 },
      loadKg: 50,
      notes: "",
    },
  ],
  units: "imperial",
};

describe("toV3", () => {
  it("gives each part the same value for women, shows the loads for men, keeps the rest", () => {
    expect(toV3(V2_DATA)).toEqual({
      ...V2_DATA,
      workouts: [
        {
          ...V2_DATA.workouts[0],
          parts: [
            {
              id: "p1",
              exercise: "box-jump",
              amount: 10,
              unit: "reps",
              kg: null,
              kgWomen: null,
              boxInches: 30,
              boxInchesWomen: null,
            },
          ],
        },
      ],
      loadsFor: "men",
    });
  });

  it("refuses data of another shape", () => {
    expect(() => toV3({ workouts: [] })).toThrow();
  });
});
