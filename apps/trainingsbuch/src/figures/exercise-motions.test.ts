import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog.ts";
import { runOf, variantsOf } from "./exercise-motions.ts";
import { HANDSTAND_PUSH_UP } from "./exercises/handstand-push-up.ts";
import { KIPPING_HANDSTAND_PUSH_UP } from "./exercises/kipping-handstand-push-up.ts";
import { KIPPING_PULL_UP } from "./exercises/kipping-pull-up.ts";
import { PULL_UP as STRICT_PULL_UP } from "./exercises/pull-up.ts";
import { THRUSTER } from "./exercises/thruster.ts";

const motions = (...args: Parameters<typeof variantsOf>) =>
  variantsOf(...args)?.map((variant) => variant.exercise);

describe("variantsOf", () => {
  it("has no animation for an exercise without one", () => {
    expect(variantsOf("ghd-sit-up", [])).toBeNull();
  });

  it("offers Kipping first and Strict for a plain pull-up", () => {
    expect(motions("pull-up", ["21-15-9", "Pull-up"])).toEqual([KIPPING_PULL_UP, STRICT_PULL_UP]);
    expect(variantsOf("pull-up", [])?.map((variant) => variant.label)).toEqual([
      "Kipping",
      "Strict",
    ]);
  });

  it("has one form without a label for an exercise with one form", () => {
    expect(variantsOf("thruster", [])).toEqual([{ key: "only", label: null, exercise: THRUSTER }]);
  });

  it.each([
    "9 strict pull-ups",
    "Strict pull-ups",
    "25 weighted pull-ups with a dumbbell",
    "20 L pull-ups",
  ])("offers only Strict for %s", (line) => {
    expect(motions("pull-up", [line])).toEqual([STRICT_PULL_UP]);
  });

  it.each([
    ["clean-and-jerk", ["Power", "Squat"]],
    ["snatch", ["Power", "Squat"]],
    ["toes-to-bar", ["Tuck", "Straight"]],
    ["kettlebell-swing", ["American", "Russian"]],
    ["handstand-push-up", ["Kipping", "Strict"]],
    ["chest-to-bar", ["Kipping", "Strict"]],
  ] as const)("offers the forms of %s", (id, labels) => {
    expect(variantsOf(id, [])?.map((variant) => variant.label)).toEqual(labels);
  });

  it("offers only Strict for a handstand push-up when the text asks for it", () => {
    expect(motions("handstand-push-up", ["10 strict handstand push-ups"])).toEqual([
      HANDSTAND_PUSH_UP,
    ]);
    expect(motions("handstand-push-up", ["10 handstand push-ups"])).toEqual([
      KIPPING_HANDSTAND_PUSH_UP,
      HANDSTAND_PUSH_UP,
    ]);
  });

  it.each([
    ["burpee", "23 burpees over the backpack"],
    ["burpee", "8 burpees (over the barbell)"],
    ["dumbbell-snatch", "10 dumbbell hang split snatches, right arm"],
    ["handstand-push-up", "25 ring handstand push-ups"],
    ["handstand-push-up", "8 freestanding handstand push-ups"],
    ["thruster", "2 squat clean thrusters"],
  ] as const)("has no animation for %s in the line: %s", (id, line) => {
    expect(variantsOf(id, [line])).toBeNull();
  });

  it("keeps the animation of a plain burpee and a plain dumbbell snatch", () => {
    expect(variantsOf("burpee", ["15 burpees"])).not.toBeNull();
    expect(variantsOf("dumbbell-snatch", ["21 dumbbell snatches"])).not.toBeNull();
  });

  it("does not take the word strict of another exercise", () => {
    expect(motions("pull-up", ["5 strict handstand push-ups", "10 pull-ups"])).toEqual([
      KIPPING_PULL_UP,
      STRICT_PULL_UP,
    ]);
  });

  it("offers no kip in the built-in workouts that ask for strict or weighted pull-ups", () => {
    const named = CATALOG.filter(
      (workout) =>
        workout.exercises.includes("pull-up") &&
        workout.lines.some((line) => /(?:strict|weighted) pull-ups?/i.test(line)),
    );
    expect(named.length).toBeGreaterThan(0);
    for (const workout of named) {
      expect(motions("pull-up", workout.lines)).toEqual([STRICT_PULL_UP]);
    }
  });
});

describe("runOf", () => {
  it("builds the loop of an exercise once", () => {
    expect(runOf(THRUSTER)).toBe(runOf(THRUSTER));
    expect(runOf(THRUSTER)).not.toBe(runOf(STRICT_PULL_UP));
  });
});
