import { describe, expect, it } from "vitest";
import { EXERCISE_IDS, EXERCISE_NAMES, exercisesByName, isWeighted, unitsOf } from "./exercises.ts";

describe("exercises", () => {
  it("has each ID and each name once", () => {
    expect(new Set(EXERCISE_IDS).size).toBe(EXERCISE_IDS.length);
    const names = Object.values(EXERCISE_NAMES);
    expect(new Set(names).size).toBe(names.length);
    expect(exercisesByName()).toHaveLength(EXERCISE_IDS.length);
  });

  it("knows the units and the weights", () => {
    expect(unitsOf("burpee-to-target")).toEqual(["reps"]);
    expect(unitsOf("row")).toEqual(["m", "cal"]);
    expect(isWeighted("alternating-dumbbell-snatch")).toBe(true);
    expect(isWeighted("burpee-to-target")).toBe(false);
  });
});
