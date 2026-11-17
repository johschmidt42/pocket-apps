import { describe, expect, it } from "vitest";
import { randomWorkoutName } from "./workout-names.ts";

/** A fake random source that returns the numbers in turn. */
function sequence(...numbers: number[]) {
  let index = 0;
  return () => numbers[index++ % numbers.length] ?? 0;
}

describe("random workout names", () => {
  it("joins an adjective and a noun", () => {
    expect(randomWorkoutName([], sequence(0, 0))).toBe("Iron Badger");
    expect(randomWorkoutName([], sequence(0.999, 0.999))).toBe("Swift Falcon");
    expect(randomWorkoutName([])).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it("does not take a name that is taken, also with other case", () => {
    expect(randomWorkoutName(["iron badger"], sequence(0, 0, 0, 0.05))).toBe("Iron Storm");
  });

  it("adds a number when it finds no free name", () => {
    expect(randomWorkoutName(["Iron Badger"], sequence(0, 0))).toBe("Iron Badger 2");
    expect(randomWorkoutName(["Iron Badger", "Iron Badger 2"], sequence(0, 0))).toBe(
      "Iron Badger 3",
    );
  });
});
