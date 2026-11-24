import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog.ts";
import { runOf, variantsOf } from "./exercise-motions.ts";
import { ALTERNATING_DUMBBELL_SNATCH } from "./exercises/alternating-dumbbell-snatch.ts";
import { BACK_EXTENSION } from "./exercises/back-extension.ts";
import { BACK_SQUAT } from "./exercises/back-squat.ts";
import { BAR_FACING_BURPEE } from "./exercises/bar-facing-burpee.ts";
import { BENCH_PRESS } from "./exercises/bench-press.ts";
import { BOX_JUMP_OVER } from "./exercises/box-jump-over.ts";
import { BOX_STEP_OVER } from "./exercises/box-step-over.ts";
import { BURPEE_BAR_MUSCLE_UP } from "./exercises/burpee-bar-muscle-up.ts";
import { BURPEE_BOX_JUMP } from "./exercises/burpee-box-jump.ts";
import { BURPEE_BOX_JUMP_OVER } from "./exercises/burpee-box-jump-over.ts";
import { BURPEE_OVER_BAR } from "./exercises/burpee-over-bar.ts";
import { BURPEE_OVER_DUMBBELL } from "./exercises/burpee-over-dumbbell.ts";
import { BURPEE_PULL_UP } from "./exercises/burpee-pull-up.ts";
import { DUMBBELL_DEADLIFT } from "./exercises/dumbbell-deadlift.ts";
import { DUMBBELL_HANG_CLEAN } from "./exercises/dumbbell-hang-clean.ts";
import { DUMBBELL_POWER_CLEAN } from "./exercises/dumbbell-power-clean.ts";
import { DUMBBELL_SQUAT } from "./exercises/dumbbell-squat.ts";
import { DUMBBELL_SQUAT_CLEAN } from "./exercises/dumbbell-squat-clean.ts";
import { DUMBBELL_THRUSTER } from "./exercises/dumbbell-thruster.ts";
import { FARMERS_CARRY } from "./exercises/farmers-carry.ts";
import { FARMERS_CARRY_KETTLEBELL } from "./exercises/farmers-carry-kettlebell.ts";
import { FRONT_SQUAT } from "./exercises/front-squat.ts";
import { GHD_SIT_UP } from "./exercises/ghd-sit-up.ts";
import { GOBLET_SQUAT } from "./exercises/goblet-squat.ts";
import { HAND_RELEASE_PUSH_UP } from "./exercises/hand-release-push-up.ts";
import { HANDSTAND } from "./exercises/handstand.ts";
import { HANDSTAND_PUSH_UP } from "./exercises/handstand-push-up.ts";
import { HANG_CLEAN } from "./exercises/hang-clean.ts";
import { HANG_POWER_CLEAN } from "./exercises/hang-power-clean.ts";
import { HANG_POWER_SNATCH } from "./exercises/hang-power-snatch.ts";
import { KETTLEBELL_THRUSTER } from "./exercises/kettlebell-thruster.ts";
import { KETTLEBELL_THRUSTER_SINGLE_ARM } from "./exercises/kettlebell-thruster-single-arm.ts";
import { KIPPING_HANDSTAND_PUSH_UP } from "./exercises/kipping-handstand-push-up.ts";
import { KIPPING_PULL_UP } from "./exercises/kipping-pull-up.ts";
import { KNEES_TO_ELBOWS } from "./exercises/knees-to-elbows.ts";
import { OVERHEAD_LUNGE_BARBELL } from "./exercises/overhead-lunge-barbell.ts";
import { OVERHEAD_LUNGE_DUMBBELL } from "./exercises/overhead-lunge-dumbbell.ts";
import { OVERHEAD_LUNGE_PLATE } from "./exercises/overhead-lunge-plate.ts";
import { OVERHEAD_SQUAT } from "./exercises/overhead-squat.ts";
import { PISTOL } from "./exercises/pistol.ts";
import { POWER_CLEAN } from "./exercises/power-clean.ts";
import { PULL_UP as STRICT_PULL_UP } from "./exercises/pull-up.ts";
import { PUSH_JERK } from "./exercises/push-jerk.ts";
import { PUSH_PRESS } from "./exercises/push-press.ts";
import { RING_DIP } from "./exercises/ring-dip.ts";
import { RING_MUSCLE_UP } from "./exercises/ring-muscle-up.ts";
import { RING_PUSH_UP } from "./exercises/ring-push-up.ts";
import { RING_ROW } from "./exercises/ring-row.ts";
import { RUN } from "./exercises/run.ts";
import { RUN_BARBELL } from "./exercises/run-barbell.ts";
import { RUN_MEDICINE_BALL } from "./exercises/run-medicine-ball.ts";
import { RUN_PLATE } from "./exercises/run-plate.ts";
import { RUN_PLATE_OVERHEAD } from "./exercises/run-plate-overhead.ts";
import { SHUTTLE_RUN } from "./exercises/shuttle-run.ts";
import { SPLIT_JERK } from "./exercises/split-jerk.ts";
import { SQUAT_CLEAN } from "./exercises/squat-clean.ts";
import { STEP_UP } from "./exercises/step-up.ts";
import { SUMO_DEADLIFT_HIGH_PULL } from "./exercises/sumo-deadlift-high-pull.ts";
import { THRUSTER } from "./exercises/thruster.ts";
import { WALKING_LUNGE } from "./exercises/walking-lunge.ts";
import { WALL_WALK } from "./exercises/wall-walk.ts";

const motions = (...args: Parameters<typeof variantsOf>) =>
  variantsOf(...args)?.map((variant) => variant.exercise);

describe("variantsOf", () => {
  it("has no animation for an exercise without one", () => {
    expect(variantsOf("bear-crawl", [])).toBeNull();
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

  it.each([
    ["Blake", OVERHEAD_LUNGE_PLATE],
    ["Hidalgo", OVERHEAD_LUNGE_PLATE],
    ["Wesley", OVERHEAD_LUNGE_PLATE],
    ["White", OVERHEAD_LUNGE_PLATE],
    ["City 100", OVERHEAD_LUNGE_BARBELL],
    ["Open 16.1", OVERHEAD_LUNGE_BARBELL],
    ["Open 19.3", OVERHEAD_LUNGE_DUMBBELL],
    ["Open 26.2", OVERHEAD_LUNGE_DUMBBELL],
  ])("shows the load of the overhead lunge in %s", (name, exercise) => {
    const workout = CATALOG.find((item) => item.name === name);
    expect(motions("overhead-lunge", workout?.lines ?? [])).toEqual([exercise]);
  });

  it("shows the push jerk and the split jerk each with their own motion", () => {
    expect(motions("push-jerk", ["9 push jerks, 70/48 kg"])).toEqual([PUSH_JERK]);
    expect(motions("split-jerk", ["5 split jerks"])).toEqual([SPLIT_JERK]);
    expect(motions("shoulder-to-overhead", ["30 shoulder-to-overheads"])).toEqual([
      PUSH_PRESS,
      PUSH_JERK,
      SPLIT_JERK,
    ]);
  });

  it("shows the dumbbell thruster with two dumbbells", () => {
    expect(motions("dumbbell-thruster", ["14 dumbbell thrusters, 22.5/15 kg"])).toEqual([
      DUMBBELL_THRUSTER,
    ]);
  });

  it("shows the squat form of the dumbbell clean for dumbbell squat cleans", () => {
    expect(motions("dumbbell-clean", ["23 dumbbell squat cleans, 18/14 kg (40/30 lb)"])).toEqual([
      DUMBBELL_SQUAT_CLEAN,
    ]);
  });

  it("shows the hang form of the dumbbell clean, also next to barbell power cleans", () => {
    expect(
      motions("dumbbell-clean", [
        "18 dumbbell hang squat cleans, 15/9 kg (35/20 lb)",
        "10 power cleans, 61/43 kg (135/95 lb)",
      ]),
    ).toEqual([DUMBBELL_HANG_CLEAN]);
  });

  it("shows the power form of the dumbbell clean for power cleans", () => {
    expect(motions("dumbbell-clean", ["8 power cleans", "Dumbbells: 22.5/15 kg"])).toEqual([
      DUMBBELL_POWER_CLEAN,
    ]);
  });

  it("offers the three forms of the dumbbell clean when the text names none", () => {
    expect(motions("dumbbell-clean", ["10 dumbbell cleans"])).toEqual([
      DUMBBELL_SQUAT_CLEAN,
      DUMBBELL_HANG_CLEAN,
      DUMBBELL_POWER_CLEAN,
    ]);
  });

  it("shows the hang power clean", () => {
    expect(motions("hang-power-clean", ["9 hang power cleans"])).toEqual([HANG_POWER_CLEAN]);
  });

  it("shows the sumo deadlift high pull", () => {
    expect(motions("sumo-deadlift-high-pull", ["21 sumo deadlift high pulls, 43/29 kg"])).toEqual([
      SUMO_DEADLIFT_HIGH_PULL,
    ]);
  });

  it("shows knees-to-elbows", () => {
    expect(motions("knees-to-elbows", ["35 knees-to-elbows"])).toEqual([KNEES_TO_ELBOWS]);
  });

  it("shows the burpee box jump", () => {
    expect(motions("burpee-box-jump", ["10 burpee box jumps, 61/51 cm (24/20 in)"])).toEqual([
      BURPEE_BOX_JUMP,
    ]);
  });

  it("shows the burpee box jump-over", () => {
    expect(motions("burpee-box-jump-over", ["15 burpee box jump-overs"])).toEqual([
      BURPEE_BOX_JUMP_OVER,
    ]);
  });

  it("shows the burpee over the bar", () => {
    expect(motions("burpee-over-bar", ["12 burpees over the bar"])).toEqual([BURPEE_OVER_BAR]);
  });

  it("shows the alternating dumbbell snatch", () => {
    expect(
      motions("alternating-dumbbell-snatch", ["22 alternating dumbbell snatches, 22.5/15 kg"]),
    ).toEqual([ALTERNATING_DUMBBELL_SNATCH]);
  });

  it("shows the wall walk, also for wall climbs", () => {
    expect(motions("wall-walk", ["3 wall walks"])).toEqual([WALL_WALK]);
    expect(motions("wall-walk", ["5 wall climbs"])).toEqual([WALL_WALK]);
  });

  it("shows the pistol, also for alternating legs", () => {
    expect(motions("pistol", ["10 pistols"])).toEqual([PISTOL]);
    expect(motions("pistol", ["60 pistols, alternating legs"])).toEqual([PISTOL]);
  });

  it("shows the ring dip", () => {
    expect(motions("ring-dip", ["10 strict ring dips"])).toEqual([RING_DIP]);
  });

  it("shows the ring muscle-up, also for a plain muscle-up", () => {
    expect(motions("ring-muscle-up", ["8 ring muscle-ups"])).toEqual([RING_MUSCLE_UP]);
    expect(motions("ring-muscle-up", ["Muscle-up"])).toEqual([RING_MUSCLE_UP]);
  });

  it("shows the ring push-up", () => {
    expect(motions("ring-push-up", ["10 ring push-ups"])).toEqual([RING_PUSH_UP]);
  });

  it("shows the ring row", () => {
    expect(motions("ring-row", ["35 ring rows"])).toEqual([RING_ROW]);
  });

  it.each([
    ["box-jump-over", "Open 22.1", [BOX_JUMP_OVER]],
    ["shuttle-run", "Open 23.2A", [SHUTTLE_RUN]],
    ["ghd-sit-up", "Hansen", [GHD_SIT_UP]],
    ["back-extension", "Michael", [BACK_EXTENSION]],
    ["shuttle-run", "Santora", [SHUTTLE_RUN]],
    ["box-step-over", "Hammy", [BOX_STEP_OVER]],
    ["burpee-bar-muscle-up", "Barraza", [BURPEE_BAR_MUSCLE_UP]],
    ["burpee-over-dumbbell", "Open 24.1", [BURPEE_OVER_DUMBBELL]],
    ["dumbbell-deadlift", "Ricky", [DUMBBELL_DEADLIFT]],
    ["dumbbell-squat", "Open 18.2", [DUMBBELL_SQUAT]],
    ["goblet-squat", "Garbo", [GOBLET_SQUAT]],
    ["handstand", "Maxim 56", [HANDSTAND]],
    ["hang-clean", "Tiff", [HANG_CLEAN]],
    ["hang-power-snatch", "Andi", [HANG_POWER_SNATCH]],
    ["kettlebell-thruster", "Strange", [KETTLEBELL_THRUSTER, KETTLEBELL_THRUSTER_SINGLE_ARM]],
    ["kettlebell-thruster", "Bowen", [KETTLEBELL_THRUSTER_SINGLE_ARM]],
  ] as const)("shows %s in %s", (id, name, exercises) => {
    const workout = CATALOG.find((item) => item.name === name);
    expect(motions(id, workout?.lines ?? [])).toEqual(exercises);
  });

  it("has no animation for the medicine-ball box step-overs of Open 26.1", () => {
    const workout = CATALOG.find((item) => item.name === "Open 26.1");
    expect(variantsOf("box-step-over", workout?.lines ?? [])).toBeNull();
    expect(motions("box-jump-over", workout?.lines ?? [])).toEqual([BOX_JUMP_OVER]);
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
    ["dumbbell-clean", ["Squat", "Hang", "Power"]],
    ["farmers-carry", ["Dumbbell", "Kettlebell"]],
    ["jerk", ["Push", "Split"]],
    ["shoulder-to-overhead", ["Press", "Push", "Split"]],
    ["overhead-lunge", ["Plate", "Bar", "DB"]],
    ["clean-and-jerk", ["Power", "Squat"]],
    ["snatch", ["Power", "Squat"]],
    ["toes-to-bar", ["Tuck", "Straight"]],
    ["kettlebell-swing", ["American", "Russian"]],
    ["handstand-push-up", ["Kipping", "Strict"]],
    ["chest-to-bar", ["Kipping", "Strict"]],
    ["kettlebell-thruster", ["Zwei", "Einarmig"]],
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
    ["dumbbell-clean", "15 dumbbell split cleans, 18/14 kg (40/30 lb)"],
    ["dumbbell-snatch", "10 dumbbell hang split snatches, right arm"],
    ["dumbbell-thruster", "Dumbbell squat clean thrusters, 29/20 kg (65/45 lb) dumbbells"],
    ["dumbbell-thruster", "10 left-arm dumbbell thrusters, 14/9 kg (30/20 lb)"],
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

  it("has no run animation for a run backwards", () => {
    expect(variantsOf("run", ["3 rounds for time of:", "200 m run backwards"])).toBeNull();
  });

  it.each([
    ["400 m run with a plate, 20/11 kg (45/25 lb)", RUN_PLATE],
    ["200 m run with a plate overhead, 20/11 kg (45/25 lb)", RUN_PLATE_OVERHEAD],
    ["1600 m run (1 mile) with a medicine ball", RUN_MEDICINE_BALL],
    ["800 m run with an empty barbell", RUN_BARBELL],
  ] as const)("shows the run with its load for: %s", (line, exercise) => {
    expect(motions("run", ["3 rounds for time of:", line])).toEqual([exercise]);
  });

  it.each([
    ["Nutts", RUN_PLATE],
    ["Walsh", RUN_PLATE_OVERHEAD],
    ["Del", RUN_MEDICINE_BALL],
    ["Dae Han", RUN_BARBELL],
  ] as const)("shows the run with its load in %s", (name, exercise) => {
    const workout = CATALOG.find((item) => item.name === name);
    expect(motions("run", workout?.lines ?? [])).toEqual([exercise]);
  });

  it("keeps the run animation for a free run, also with a vest", () => {
    expect(motions("run", ["400 m run"])).toEqual([RUN]);
    expect(motions("run", ["1600 m run", "With a 9/6 kg (20/14 lb) vest for the runs"])).toEqual([
      RUN,
    ]);
  });

  it("offers the free run and the run with a load when a workout has both", () => {
    const lines = ["800 m run", "400 m run with a plate, 20/11 kg"];
    expect(variantsOf("run", lines)?.map((variant) => variant.label)).toEqual(["Free", "Plate"]);
    expect(motions("run", lines)).toEqual([RUN, RUN_PLATE]);
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
