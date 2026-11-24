import type { ExerciseId } from "../exercises.ts";
import type { Exercise } from "./exercise.ts";
import { AIR_SQUAT } from "./exercises/air-squat.ts";
import { ALTERNATING_DUMBBELL_SNATCH } from "./exercises/alternating-dumbbell-snatch.ts";
import { BACK_SQUAT } from "./exercises/back-squat.ts";
import { BAR_FACING_BURPEE } from "./exercises/bar-facing-burpee.ts";
import { BAR_MUSCLE_UP } from "./exercises/bar-muscle-up.ts";
import { BENCH_PRESS } from "./exercises/bench-press.ts";
import { BIKE_EXERCISE } from "./exercises/bike.ts";
import { BOX_JUMP } from "./exercises/box-jump.ts";
import { BOX_JUMP_OVER } from "./exercises/box-jump-over.ts";
import { BOX_STEP_OVER } from "./exercises/box-step-over.ts";
import { BURPEE } from "./exercises/burpee.ts";
import { BURPEE_BAR_MUSCLE_UP } from "./exercises/burpee-bar-muscle-up.ts";
import { BURPEE_BOX_JUMP } from "./exercises/burpee-box-jump.ts";
import { BURPEE_BOX_JUMP_OVER } from "./exercises/burpee-box-jump-over.ts";
import { BURPEE_OVER_BAR } from "./exercises/burpee-over-bar.ts";
import { BURPEE_OVER_DUMBBELL } from "./exercises/burpee-over-dumbbell.ts";
import { BURPEE_PULL_UP } from "./exercises/burpee-pull-up.ts";
import { CHEST_TO_BAR_PULL_UP } from "./exercises/chest-to-bar-pull-up.ts";
import { CLEAN_AND_JERK } from "./exercises/clean-and-jerk.ts";
import { DEADLIFT } from "./exercises/deadlift.ts";
import { DOUBLE_UNDER } from "./exercises/double-under.ts";
import { DUMBBELL_DEADLIFT } from "./exercises/dumbbell-deadlift.ts";
import { DUMBBELL_HANG_CLEAN } from "./exercises/dumbbell-hang-clean.ts";
import { DUMBBELL_POWER_CLEAN } from "./exercises/dumbbell-power-clean.ts";
import { DUMBBELL_SNATCH } from "./exercises/dumbbell-snatch.ts";
import { DUMBBELL_SQUAT as DUMBBELL_FRONT_SQUAT } from "./exercises/dumbbell-squat.ts";
import { DUMBBELL_SQUAT_CLEAN } from "./exercises/dumbbell-squat-clean.ts";
import { DUMBBELL_THRUSTER } from "./exercises/dumbbell-thruster.ts";
import { FARMERS_CARRY } from "./exercises/farmers-carry.ts";
import { FARMERS_CARRY_KETTLEBELL } from "./exercises/farmers-carry-kettlebell.ts";
import { FRONT_SQUAT } from "./exercises/front-squat.ts";
import { GOBLET_SQUAT } from "./exercises/goblet-squat.ts";
import { HAND_RELEASE_PUSH_UP } from "./exercises/hand-release-push-up.ts";
import { HANDSTAND } from "./exercises/handstand.ts";
import { HANDSTAND_PUSH_UP } from "./exercises/handstand-push-up.ts";
import { HANG_CLEAN } from "./exercises/hang-clean.ts";
import { HANG_POWER_CLEAN } from "./exercises/hang-power-clean.ts";
import { HANG_POWER_SNATCH } from "./exercises/hang-power-snatch.ts";
import { KETTLEBELL_SWING_AMERICAN } from "./exercises/kettlebell-swing-american.ts";
import { KETTLEBELL_SWING_RUSSIAN } from "./exercises/kettlebell-swing-russian.ts";
import { KETTLEBELL_THRUSTER } from "./exercises/kettlebell-thruster.ts";
import { KETTLEBELL_THRUSTER_SINGLE_ARM } from "./exercises/kettlebell-thruster-single-arm.ts";
import { KIPPING_CHEST_TO_BAR_PULL_UP } from "./exercises/kipping-chest-to-bar-pull-up.ts";
import { KIPPING_HANDSTAND_PUSH_UP } from "./exercises/kipping-handstand-push-up.ts";
import { KIPPING_PULL_UP } from "./exercises/kipping-pull-up.ts";
import { KNEES_TO_ELBOWS } from "./exercises/knees-to-elbows.ts";
import { OVERHEAD_LUNGE_BARBELL } from "./exercises/overhead-lunge-barbell.ts";
import { OVERHEAD_LUNGE_DUMBBELL } from "./exercises/overhead-lunge-dumbbell.ts";
import { OVERHEAD_LUNGE_PLATE } from "./exercises/overhead-lunge-plate.ts";
import { OVERHEAD_SQUAT } from "./exercises/overhead-squat.ts";
import { PISTOL } from "./exercises/pistol.ts";
import { POWER_CLEAN } from "./exercises/power-clean.ts";
import { POWER_CLEAN_AND_JERK } from "./exercises/power-clean-and-jerk.ts";
import { POWER_SNATCH } from "./exercises/power-snatch.ts";
import { PULL_UP } from "./exercises/pull-up.ts";
import { PUSH_JERK } from "./exercises/push-jerk.ts";
import { PUSH_PRESS } from "./exercises/push-press.ts";
import { PUSH_UP } from "./exercises/push-up.ts";
import { RING_DIP } from "./exercises/ring-dip.ts";
import { RING_MUSCLE_UP } from "./exercises/ring-muscle-up.ts";
import { RING_PUSH_UP } from "./exercises/ring-push-up.ts";
import { RING_ROW } from "./exercises/ring-row.ts";
import { ROPE_CLIMB } from "./exercises/rope-climb.ts";
import { ROW } from "./exercises/row.ts";
import { RUN } from "./exercises/run.ts";
import { SIT_UP } from "./exercises/sit-up.ts";
import { SKI } from "./exercises/ski.ts";
import { SNATCH } from "./exercises/snatch.ts";
import { SPLIT_JERK } from "./exercises/split-jerk.ts";
import { SQUAT_CLEAN } from "./exercises/squat-clean.ts";
import { STEP_UP } from "./exercises/step-up.ts";
import { SUMO_DEADLIFT_HIGH_PULL } from "./exercises/sumo-deadlift-high-pull.ts";
import { THRUSTER } from "./exercises/thruster.ts";
import { TOES_TO_BAR } from "./exercises/toes-to-bar.ts";
import { TOES_TO_BAR_TUCK } from "./exercises/toes-to-bar-tuck.ts";
import { WALKING_LUNGE } from "./exercises/walking-lunge.ts";
import { WALL_BALL } from "./exercises/wall-ball.ts";
import { WALL_WALK } from "./exercises/wall-walk.ts";
import type { Motion } from "./skeleton.ts";
import { motionOf } from "./turning-motion.ts";

/** One form of an exercise. `label` is null when the exercise has only this form. */
export type ExerciseVariant = { key: string; label: string | null; exercise: Exercise };

/** The forms of an exercise. The first one shows first. */
export type ExerciseVariants = readonly [ExerciseVariant, ...ExerciseVariant[]];

const form = (label: string, exercise: Exercise): ExerciseVariant => ({
  key: label.toLowerCase(),
  label,
  exercise,
});
const only = (exercise: Exercise): ExerciseVariants => [{ key: "only", label: null, exercise }];

const STRICT_PULL_UP = form("Strict", PULL_UP);
const STRICT_HANDSTAND_PUSH_UP = form("Strict", HANDSTAND_PUSH_UP);
const KETTLEBELL_CARRY = form("Kettlebell", FARMERS_CARRY_KETTLEBELL);
const PLATE_LUNGE = form("Plate", OVERHEAD_LUNGE_PLATE);
const BARBELL_LUNGE = form("Bar", OVERHEAD_LUNGE_BARBELL);
const DUMBBELL_LUNGE = form("DB", OVERHEAD_LUNGE_DUMBBELL);
const DUMBBELL_SQUAT = form("Squat", DUMBBELL_SQUAT_CLEAN);
const DUMBBELL_HANG = form("Hang", DUMBBELL_HANG_CLEAN);
const DUMBBELL_POWER = form("Power", DUMBBELL_POWER_CLEAN);
const SINGLE_ARM_THRUSTER = form("Einarmig", KETTLEBELL_THRUSTER_SINGLE_ARM);

/**
 * The exercises that have an animation. To add one, copy its file from the prototype into
 * `exercises/` and add it here. A general exercise lists its forms: the user can switch between
 * them. The first form is the one that most athletes do in a workout.
 */
const EXERCISE_VARIANTS: Partial<Record<ExerciseId, ExerciseVariants>> = {
  "air-squat": only(AIR_SQUAT),
  "air-bike": only(BIKE_EXERCISE),
  "alternating-dumbbell-snatch": only(ALTERNATING_DUMBBELL_SNATCH),
  "back-squat": only(BACK_SQUAT),
  "bar-facing-burpee": only(BAR_FACING_BURPEE),
  "bar-muscle-up": only(BAR_MUSCLE_UP),
  "bench-press": only(BENCH_PRESS),
  bike: only(BIKE_EXERCISE),
  "box-jump": only(BOX_JUMP),
  burpee: only(BURPEE),
  "burpee-box-jump": only(BURPEE_BOX_JUMP),
  "burpee-box-jump-over": only(BURPEE_BOX_JUMP_OVER),
  "burpee-over-bar": only(BURPEE_OVER_BAR),
  "burpee-pull-up": only(BURPEE_PULL_UP),
  "chest-to-bar": [
    form("Kipping", KIPPING_CHEST_TO_BAR_PULL_UP),
    form("Strict", CHEST_TO_BAR_PULL_UP),
  ],
  clean: [form("Power", POWER_CLEAN), form("Squat", SQUAT_CLEAN)],
  "clean-and-jerk": [form("Power", POWER_CLEAN_AND_JERK), form("Squat", CLEAN_AND_JERK)],
  deadlift: only(DEADLIFT),
  "double-under": only(DOUBLE_UNDER),
  "dumbbell-clean": [DUMBBELL_SQUAT, DUMBBELL_HANG, DUMBBELL_POWER],
  "dumbbell-snatch": only(DUMBBELL_SNATCH),
  "dumbbell-thruster": only(DUMBBELL_THRUSTER),
  "farmers-carry": [form("Dumbbell", FARMERS_CARRY), KETTLEBELL_CARRY],
  "front-squat": only(FRONT_SQUAT),
  "hand-release-push-up": only(HAND_RELEASE_PUSH_UP),
  "hang-power-clean": only(HANG_POWER_CLEAN),
  "handstand-push-up": [form("Kipping", KIPPING_HANDSTAND_PUSH_UP), STRICT_HANDSTAND_PUSH_UP],
  jerk: [form("Push", PUSH_JERK), form("Split", SPLIT_JERK)],
  "knees-to-elbows": only(KNEES_TO_ELBOWS),
  "kettlebell-swing": [
    form("American", KETTLEBELL_SWING_AMERICAN),
    form("Russian", KETTLEBELL_SWING_RUSSIAN),
  ],
  "overhead-lunge": [PLATE_LUNGE, BARBELL_LUNGE, DUMBBELL_LUNGE],
  "overhead-squat": only(OVERHEAD_SQUAT),
  pistol: only(PISTOL),
  "power-clean": only(POWER_CLEAN),
  "power-snatch": only(POWER_SNATCH),
  "pull-up": [form("Kipping", KIPPING_PULL_UP), STRICT_PULL_UP],
  "push-jerk": only(PUSH_JERK),
  "push-press": only(PUSH_PRESS),
  "push-up": only(PUSH_UP),
  "ring-dip": only(RING_DIP),
  "ring-muscle-up": only(RING_MUSCLE_UP),
  "ring-push-up": only(RING_PUSH_UP),
  "ring-row": only(RING_ROW),
  "rope-climb": only(ROPE_CLIMB),
  row: only(ROW),
  run: only(RUN),
  "shoulder-to-overhead": [
    form("Press", PUSH_PRESS),
    form("Push", PUSH_JERK),
    form("Split", SPLIT_JERK),
  ],
  "sit-up": only(SIT_UP),
  ski: only(SKI),
  snatch: [form("Power", POWER_SNATCH), form("Squat", SNATCH)],
  "split-jerk": only(SPLIT_JERK),
  "squat-clean": only(SQUAT_CLEAN),
  "squat-snatch": only(SNATCH),
  "step-up": only(STEP_UP),
  "sumo-deadlift-high-pull": only(SUMO_DEADLIFT_HIGH_PULL),
  "strict-handstand-push-up": only(HANDSTAND_PUSH_UP),
  "strict-pull-up": only(PULL_UP),
  thruster: only(THRUSTER),
  "toes-to-bar": [form("Tuck", TOES_TO_BAR_TUCK), form("Straight", TOES_TO_BAR)],
  "walking-lunge": only(WALKING_LUNGE),
  "wall-walk": only(WALL_WALK),
  "wall-ball": only(WALL_BALL),
  "box-jump-over": only(BOX_JUMP_OVER),
  "box-step-over": only(BOX_STEP_OVER),
  "burpee-bar-muscle-up": only(BURPEE_BAR_MUSCLE_UP),
  "burpee-over-dumbbell": only(BURPEE_OVER_DUMBBELL),
  "dumbbell-deadlift": only(DUMBBELL_DEADLIFT),
  "dumbbell-squat": only(DUMBBELL_FRONT_SQUAT),
  "goblet-squat": only(GOBLET_SQUAT),
  handstand: only(HANDSTAND),
  "hang-clean": only(HANG_CLEAN),
  "hang-power-snatch": only(HANG_POWER_SNATCH),
  "kettlebell-thruster": [form("Zwei", KETTLEBELL_THRUSTER), SINGLE_ARM_THRUSTER],
};

/**
 * Some workouts have a general id, but their text asks for one form. The first pattern that fits
 * a line of the workout wins.
 */
const FORMS_IN_TEXT: Partial<
  Record<ExerciseId, readonly { pattern: RegExp; variant: ExerciseVariant }[]>
> = {
  // The order is important: Santiago has dumbbell hang squat cleans and barbell power cleans.
  "dumbbell-clean": [
    { pattern: /\bhang squat clean/i, variant: DUMBBELL_HANG },
    { pattern: /\bpower cleans?\b/i, variant: DUMBBELL_POWER },
    { pattern: /\bsquat cleans?\b/i, variant: DUMBBELL_SQUAT },
  ],
  "farmers-carry": [{ pattern: /\bkettlebell farmers carry\b/i, variant: KETTLEBELL_CARRY }],
  "kettlebell-thruster": [
    { pattern: /\bsingle-arm kettlebell thrusters?\b/i, variant: SINGLE_ARM_THRUSTER },
  ],
  "handstand-push-up": [
    { pattern: /\bstrict\s+handstand\s+push-?ups?\b/i, variant: STRICT_HANDSTAND_PUSH_UP },
  ],
  "overhead-lunge": [
    { pattern: /\bdumbbell overhead (?:walking )?lunge/i, variant: DUMBBELL_LUNGE },
    { pattern: /\blunges?\b.*\bplate\b/i, variant: PLATE_LUNGE },
    { pattern: /^barbell:|\boverhead walking lunge, \d/i, variant: BARBELL_LUNGE },
  ],
  "pull-up": [{ pattern: /\b(?:strict|weighted|L)\s+pull-?ups?\b/i, variant: STRICT_PULL_UP }],
};

/** Some workouts have the id of an exercise, but their text asks for another movement. */
const OTHER_MOVEMENT: Partial<Record<ExerciseId, RegExp>> = {
  burpee: /\bburpees?\b[^,]*\bover\b/i,
  "box-step-over": /\bmedicine-ball box step-overs?\b/i,
  "burpee-pull-up": /\b(?:strict burpee|burpee chest-to-bar)/i,
  "dumbbell-clean": /\bsplit cleans?\b/i,
  "dumbbell-snatch": /\bsplit snatch/i,
  "dumbbell-thruster": /\bsquat clean thrusters?\b|\b(?:left|right)-arm dumbbell thrusters?\b/i,
  "farmers-carry": /\bbarbell farmers carry\b/i,
  "handstand-push-up": /\b(?:ring|freestanding)\s+handstand/i,
  "overhead-squat": /\boverhead squats?\b.*\b(?:left|right) arm\b/i,
  "step-up": /\b(?:barbell|dumbbell)\b.*\bstep-ups?\b/i,
  thruster: /\bsquat clean thrusters?\b/i,
  "walking-lunge": /\b(?:weighted|dumbbell) walking lunges?\b|\bwalking lunges? with\b/i,
};

/** A run with a load in the hands, or backwards. The animation shows a free run. */
const OTHER_RUN = /\bruns?\b.*\b(?:with an? (?:plate|medicine ball|empty barbell)|backwards)\b/i;
const RUN_DISTANCE = /\bm run\b/i;

/** True if the workout has another form of the run and no free run beside it. */
function onlyOtherRuns(lines: readonly string[]): boolean {
  return (
    lines.some((line) => OTHER_RUN.test(line)) &&
    !lines.some((line) => RUN_DISTANCE.test(line) && !OTHER_RUN.test(line))
  );
}

/** The forms of an exercise in a workout with these lines. `null`: it has no animation here. */
export function variantsOf(id: ExerciseId, lines: readonly string[]): ExerciseVariants | null {
  if (id === "run" && onlyOtherRuns(lines)) return null;
  const other = OTHER_MOVEMENT[id];
  if (other && lines.some((line) => other.test(line))) return null;
  const named = FORMS_IN_TEXT[id]?.find(({ pattern }) => lines.some((line) => pattern.test(line)));
  if (named) return [named.variant];
  return EXERCISE_VARIANTS[id] ?? null;
}

const RUNS = new WeakMap<Exercise, Motion>();

/** The prepared loop of an exercise. It is built once. */
export function runOf(exercise: Exercise): Motion {
  const known = RUNS.get(exercise);
  if (known) return known;
  const run = motionOf(exercise);
  RUNS.set(exercise, run);
  return run;
}
