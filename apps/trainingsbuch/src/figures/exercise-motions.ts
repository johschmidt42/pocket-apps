import type { ExerciseId } from "../exercises.ts";
import type { Exercise } from "./exercise.ts";
import { AIR_SQUAT } from "./exercises/air-squat.ts";
import { BACK_SQUAT } from "./exercises/back-squat.ts";
import { BAR_MUSCLE_UP } from "./exercises/bar-muscle-up.ts";
import { BIKE_EXERCISE } from "./exercises/bike.ts";
import { BOX_JUMP } from "./exercises/box-jump.ts";
import { BURPEE } from "./exercises/burpee.ts";
import { CHEST_TO_BAR_PULL_UP } from "./exercises/chest-to-bar-pull-up.ts";
import { CLEAN_AND_JERK } from "./exercises/clean-and-jerk.ts";
import { DEADLIFT } from "./exercises/deadlift.ts";
import { DOUBLE_UNDER } from "./exercises/double-under.ts";
import { DUMBBELL_SNATCH } from "./exercises/dumbbell-snatch.ts";
import { FRONT_SQUAT } from "./exercises/front-squat.ts";
import { HANDSTAND_PUSH_UP } from "./exercises/handstand-push-up.ts";
import { KETTLEBELL_SWING_AMERICAN } from "./exercises/kettlebell-swing-american.ts";
import { KETTLEBELL_SWING_RUSSIAN } from "./exercises/kettlebell-swing-russian.ts";
import { KIPPING_CHEST_TO_BAR_PULL_UP } from "./exercises/kipping-chest-to-bar-pull-up.ts";
import { KIPPING_HANDSTAND_PUSH_UP } from "./exercises/kipping-handstand-push-up.ts";
import { KIPPING_PULL_UP } from "./exercises/kipping-pull-up.ts";
import { POWER_CLEAN_AND_JERK } from "./exercises/power-clean-and-jerk.ts";
import { POWER_CLEAN } from "./exercises/power-clean.ts";
import { POWER_SNATCH } from "./exercises/power-snatch.ts";
import { PULL_UP } from "./exercises/pull-up.ts";
import { PUSH_UP } from "./exercises/push-up.ts";
import { ROPE_CLIMB } from "./exercises/rope-climb.ts";
import { ROW } from "./exercises/row.ts";
import { RUN } from "./exercises/run.ts";
import { SIT_UP } from "./exercises/sit-up.ts";
import { SKI } from "./exercises/ski.ts";
import { SNATCH } from "./exercises/snatch.ts";
import { SQUAT_CLEAN } from "./exercises/squat-clean.ts";
import { THRUSTER } from "./exercises/thruster.ts";
import { TOES_TO_BAR_TUCK } from "./exercises/toes-to-bar-tuck.ts";
import { TOES_TO_BAR } from "./exercises/toes-to-bar.ts";
import { WALL_BALL } from "./exercises/wall-ball.ts";
import { motion, type Motion } from "./skeleton.ts";

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

/**
 * The exercises that have an animation. To add one, copy its file from the prototype into
 * `exercises/` and add it here. A general exercise lists its forms: the user can switch between
 * them. The first form is the one that most athletes do in a workout.
 */
const EXERCISE_VARIANTS: Partial<Record<ExerciseId, ExerciseVariants>> = {
  "air-squat": only(AIR_SQUAT),
  "air-bike": only(BIKE_EXERCISE),
  "back-squat": only(BACK_SQUAT),
  "bar-muscle-up": only(BAR_MUSCLE_UP),
  bike: only(BIKE_EXERCISE),
  "box-jump": only(BOX_JUMP),
  burpee: only(BURPEE),
  "chest-to-bar": [
    form("Kipping", KIPPING_CHEST_TO_BAR_PULL_UP),
    form("Strict", CHEST_TO_BAR_PULL_UP),
  ],
  clean: [form("Power", POWER_CLEAN), form("Squat", SQUAT_CLEAN)],
  "clean-and-jerk": [form("Power", POWER_CLEAN_AND_JERK), form("Squat", CLEAN_AND_JERK)],
  deadlift: only(DEADLIFT),
  "double-under": only(DOUBLE_UNDER),
  "dumbbell-snatch": only(DUMBBELL_SNATCH),
  "front-squat": only(FRONT_SQUAT),
  "handstand-push-up": [form("Kipping", KIPPING_HANDSTAND_PUSH_UP), STRICT_HANDSTAND_PUSH_UP],
  "kettlebell-swing": [
    form("American", KETTLEBELL_SWING_AMERICAN),
    form("Russian", KETTLEBELL_SWING_RUSSIAN),
  ],
  "power-clean": only(POWER_CLEAN),
  "power-snatch": only(POWER_SNATCH),
  "pull-up": [form("Kipping", KIPPING_PULL_UP), STRICT_PULL_UP],
  "push-up": only(PUSH_UP),
  "rope-climb": only(ROPE_CLIMB),
  row: only(ROW),
  run: only(RUN),
  "sit-up": only(SIT_UP),
  ski: only(SKI),
  snatch: [form("Power", POWER_SNATCH), form("Squat", SNATCH)],
  "squat-clean": only(SQUAT_CLEAN),
  "squat-snatch": only(SNATCH),
  "strict-handstand-push-up": only(HANDSTAND_PUSH_UP),
  "strict-pull-up": only(PULL_UP),
  thruster: only(THRUSTER),
  "toes-to-bar": [form("Tuck", TOES_TO_BAR_TUCK), form("Straight", TOES_TO_BAR)],
  "wall-ball": only(WALL_BALL),
};

/** Some workouts have a general id, but their text asks for the strict form. */
const STRICT_IN_TEXT: Partial<Record<ExerciseId, { pattern: RegExp; variant: ExerciseVariant }>> = {
  "pull-up": { pattern: /\b(?:strict|weighted|L)\s+pull-?ups?\b/i, variant: STRICT_PULL_UP },
  "handstand-push-up": {
    pattern: /\bstrict\s+handstand\s+push-?ups?\b/i,
    variant: STRICT_HANDSTAND_PUSH_UP,
  },
};

/** Some workouts have the id of an exercise, but their text asks for another movement. */
const OTHER_MOVEMENT: Partial<Record<ExerciseId, RegExp>> = {
  burpee: /\bburpees?\b[^,]*\bover\b/i,
  "dumbbell-snatch": /\bsplit snatch/i,
  "handstand-push-up": /\b(?:ring|freestanding)\s+handstand/i,
  thruster: /\bsquat clean thrusters?\b/i,
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
  const strict = STRICT_IN_TEXT[id];
  if (strict && lines.some((line) => strict.pattern.test(line))) return [strict.variant];
  return EXERCISE_VARIANTS[id] ?? null;
}

const RUNS = new WeakMap<Exercise, Motion>();

/** The prepared loop of an exercise. It is built once. */
export function runOf(exercise: Exercise): Motion {
  const known = RUNS.get(exercise);
  if (known) return known;
  const run = motion(exercise.start, exercise.steps);
  RUNS.set(exercise, run);
  return run;
}
