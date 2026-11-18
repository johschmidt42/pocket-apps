import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog.ts";
import {
  choiceOf,
  choose,
  EXERCISE_GROUPS,
  exerciseCounts,
  exerciseOptions,
  filterByExercises,
  hasExerciseFilter,
  NO_EXERCISE_FILTER,
} from "./exercise-filter.ts";
import { EXERCISE_IDS } from "./exercises.ts";
import type { Workout } from "./workouts.ts";

function workout(id: string): Workout {
  const found = CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

const FRAN = workout("fran"); // thruster, pull-up
const JACKIE = workout("jackie"); // row, thruster, pull-up
const GRACE = workout("grace"); // clean-and-jerk

describe("exercise filter", () => {
  it("keeps the workouts with all 'with' exercises and none of the 'without' exercises", () => {
    const list = [FRAN, JACKIE, GRACE];
    expect(filterByExercises(list, NO_EXERCISE_FILTER)).toEqual(list);
    expect(filterByExercises(list, { with: ["thruster", "pull-up"], without: [] })).toEqual([
      FRAN,
      JACKIE,
    ]);
    expect(filterByExercises(list, { with: ["thruster"], without: ["row"] })).toEqual([FRAN]);
    expect(filterByExercises(list, { with: [], without: ["thruster"] })).toEqual([GRACE]);
  });

  it("sets, changes and removes the choice of an exercise", () => {
    let filter = choose(NO_EXERCISE_FILTER, "thruster", "with");
    filter = choose(filter, "row", "without");
    filter = choose(filter, "pull-up", "with");
    expect(filter).toEqual({ with: ["thruster", "pull-up"], without: ["row"] });
    expect(hasExerciseFilter(filter)).toBe(true);
    expect(choiceOf(filter, "row")).toBe("without");
    expect(choiceOf(filter, "burpee")).toBeNull();

    // The same choice again changes nothing, also not the order.
    expect(choose(filter, "thruster", "with")).toBe(filter);
    // Another choice moves the exercise.
    expect(choose(filter, "thruster", "without")).toEqual({
      with: ["pull-up"],
      without: ["row", "thruster"],
    });
    filter = choose(choose(choose(filter, "thruster", null), "row", null), "pull-up", null);
    expect(filter).toEqual(NO_EXERCISE_FILTER);
    expect(hasExerciseFilter(filter)).toBe(false);
  });

  it("puts each exercise into exactly one group", () => {
    const grouped = EXERCISE_GROUPS.flatMap((group) => group.exercises);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...EXERCISE_IDS].sort());
  });

  it("lists the used exercises by group and name, with their count and a search", () => {
    const counts = exerciseCounts([FRAN, JACKIE, GRACE]);
    expect(counts.get("thruster")).toBe(2);
    expect(counts.has("burpee")).toBe(false);

    expect(exerciseOptions(counts, "", NO_EXERCISE_FILTER)).toEqual([
      {
        key: "barbell",
        title: "Langhantel",
        options: [
          { id: "clean-and-jerk", name: "Clean & Jerk", count: 1 },
          { id: "thruster", name: "Thruster", count: 2 },
        ],
      },
      {
        key: "gymnastics",
        title: "Turnen & Körpergewicht",
        options: [{ id: "pull-up", name: "Pull-up", count: 2 }],
      },
      { key: "cardio", title: "Ausdauer", options: [{ id: "row", name: "Row", count: 1 }] },
    ]);
    expect(exerciseOptions(counts, " THRU ", NO_EXERCISE_FILTER)).toEqual([
      {
        key: "barbell",
        title: "Langhantel",
        options: [{ id: "thruster", name: "Thruster", count: 2 }],
      },
    ]);
    // A chosen exercise stays in the picker, also without a workout: the user can remove it.
    expect(exerciseOptions(counts, "burp", { with: [], without: ["burpee"] })).toEqual([
      {
        key: "gymnastics",
        title: "Turnen & Körpergewicht",
        options: [{ id: "burpee", name: "Burpee", count: 0 }],
      },
    ]);
  });
});
