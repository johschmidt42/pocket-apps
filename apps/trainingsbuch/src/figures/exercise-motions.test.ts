import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog.ts";
import { runOf, variantsOf } from "./exercise-motions.ts";
import { BACK_SQUAT } from "./exercises/back-squat.ts";
import { BAR_FACING_BURPEE } from "./exercises/bar-facing-burpee.ts";
import { BENCH_PRESS } from "./exercises/bench-press.ts";
import { BURPEE_PULL_UP } from "./exercises/burpee-pull-up.ts";
import { FARMERS_CARRY_KETTLEBELL } from "./exercises/farmers-carry-kettlebell.ts";
import { FARMERS_CARRY } from "./exercises/farmers-carry.ts";
import { FRONT_SQUAT } from "./exercises/front-squat.ts";
import { HAND_RELEASE_PUSH_UP } from "./exercises/hand-release-push-up.ts";
import { HANDSTAND_PUSH_UP } from "./exercises/handstand-push-up.ts";
import { KIPPING_HANDSTAND_PUSH_UP } from "./exercises/kipping-handstand-push-up.ts";
import { KIPPING_PULL_UP } from "./exercises/kipping-pull-up.ts";
import { OVERHEAD_SQUAT } from "./exercises/overhead-squat.ts";
import { POWER_CLEAN } from "./exercises/power-clean.ts";
import { PULL_UP as STRICT_PULL_UP } from "./exercises/pull-up.ts";
import { PUSH_PRESS } from "./exercises/push-press.ts";
import { RUN } from "./exercises/run.ts";
import { SQUAT_CLEAN } from "./exercises/squat-clean.ts";
import { STEP_UP } from "./exercises/step-up.ts";
import { THRUSTER } from "./exercises/thruster.ts";
import { WALKING_LUNGE } from "./exercises/walking-lunge.ts";

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

  it("shows the power clean and the squat clean each with their own motion", () => {
    expect(motions("power-clean", ["15 power cleans, 61/43 kg"])).toEqual([POWER_CLEAN]);
    expect(motions("squat-clean", ["10 squat cleans, 61/43 kg"])).toEqual([SQUAT_CLEAN]);
  });

  it("shows the back squat and the front squat each with their own motion", () => {
    expect(motions("back-squat", ["5 back squats, 102/70 kg"])).toEqual([BACK_SQUAT]);
    expect(motions("front-squat", ["5 front squats, 61/43 kg"])).toEqual([FRONT_SQUAT]);
  });

  it("shows the overhead squat with a bar in both hands", () => {
    expect(motions("overhead-squat", ["15 overhead squats, 43/30 kg"])).toEqual([OVERHEAD_SQUAT]);
  });

  it("offers only Kettlebell for a carry that names kettlebells", () => {
    expect(motions("farmers-carry", ["30 m (100 ft) double-kettlebell farmers carry"])).toEqual([
      FARMERS_CARRY_KETTLEBELL,
    ]);
    expect(motions("farmers-carry", ["200 m farmers carry, 22.5/15 kg dumbbells"])).toEqual([
      FARMERS_CARRY,
      FARMERS_CARRY_KETTLEBELL,
    ]);
  });

  it("shows the bar-facing burpee", () => {
    expect(motions("bar-facing-burpee", ["9 bar-facing burpees"])).toEqual([BAR_FACING_BURPEE]);
  });

  it("shows the step-up, also with a backpack", () => {
    expect(motions("step-up", ["25 box step-ups, 61/51 cm (24/20 in)"])).toEqual([STEP_UP]);
    expect(
      motions("step-up", ["25 box step-ups, 61/51 cm (24/20 in), with a 20 kg (45 lb) backpack"]),
    ).toEqual([STEP_UP]);
  });

  it("shows the bench press", () => {
    expect(motions("bench-press", ["10 bench presses, 61/43 kg"])).toEqual([BENCH_PRESS]);
  });

  it("shows the hand-release push-up", () => {
    expect(motions("hand-release-push-up", ["10 hand-release push-ups"])).toEqual([
      HAND_RELEASE_PUSH_UP,
    ]);
  });

  it("shows the walking lunge without a load", () => {
    expect(motions("walking-lunge", ["50 walking lunges"])).toEqual([WALKING_LUNGE]);
    expect(motions("walking-lunge", ["30 walking lunge steps"])).toEqual([WALKING_LUNGE]);
    expect(motions("walking-lunge", ["75 m (250 ft) walking lunge (5 × 15 m (50 ft))"])).toEqual([
      WALKING_LUNGE,
    ]);
  });

  it("shows the push press", () => {
    expect(motions("push-press", ["15 push presses, 52/35 kg"])).toEqual([PUSH_PRESS]);
  });

  it("shows the burpee pull-up for a plain burpee pull-up", () => {
    expect(motions("burpee-pull-up", ["10 burpee pull-ups"])).toEqual([BURPEE_PULL_UP]);
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
    ["clean", ["Power", "Squat"]],
    ["farmers-carry", ["Dumbbell", "Kettlebell"]],
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
    ["burpee-pull-up", "7 strict burpee pull-ups"],
    ["burpee-pull-up", "7 burpee chest-to-bar pull-ups"],
    ["dumbbell-snatch", "10 dumbbell hang split snatches, right arm"],
    ["farmers-carry", "800 m single-arm barbell farmers carry, 43/30 kg"],
    ["farmers-carry", "10 m barbell farmers carry, 102/70 kg"],
    ["handstand-push-up", "25 ring handstand push-ups"],
    ["handstand-push-up", "8 freestanding handstand push-ups"],
    ["overhead-squat", "21 overhead squats, left arm"],
    ["step-up", "30 barbell step-ups, 61/43 kg, 61/51 cm (24/20 in) box"],
    ["step-up", "20 barbell back-rack step-ups, 61/51 cm (24/20 in)"],
    ["step-up", "50 dumbbell box step-ups"],
    ["thruster", "2 squat clean thrusters"],
    ["walking-lunge", "15 m (50 ft) weighted walking lunge"],
    ["walking-lunge", "20 dumbbell walking lunges, 22.5/15 kg (50/35 lb)"],
    ["walking-lunge", "20 walking lunges with two kettlebells"],
  ] as const)("has no animation for %s in the line: %s", (id, line) => {
    expect(variantsOf(id, [line])).toBeNull();
  });

  it("keeps the animation of a plain burpee and a plain dumbbell snatch", () => {
    expect(variantsOf("burpee", ["15 burpees"])).not.toBeNull();
    expect(variantsOf("dumbbell-snatch", ["21 dumbbell snatches"])).not.toBeNull();
  });

  it.each([
    "400 m run with a plate, 20/11 kg (45/25 lb)",
    "1600 m run (1 mile) with a medicine ball",
    "800 m run with an empty barbell",
    "200 m run backwards",
  ])("has no run animation for: %s", (line) => {
    expect(variantsOf("run", ["3 rounds for time of:", line])).toBeNull();
  });

  it("keeps the run animation for a free run, also with a vest", () => {
    expect(motions("run", ["400 m run"])).toEqual([RUN]);
    expect(motions("run", ["1600 m run", "With a 9/6 kg (20/14 lb) vest for the runs"])).toEqual([
      RUN,
    ]);
  });

  it("keeps the run animation when a free run is beside a run with a load", () => {
    expect(motions("run", ["800 m run", "400 m run with a plate, 20/11 kg"])).toEqual([RUN]);
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
