// The exercise filter of the workout list: exercises that a workout must have ("mit") and
// exercises that it must not have ("ohne").
import { EXERCISE_NAMES, type ExerciseId } from "./exercises.ts";
import type { Workout } from "./workouts.ts";

/** The chosen exercises, in the order in which the user chose them. */
export type ExerciseFilter = { with: readonly ExerciseId[]; without: readonly ExerciseId[] };

export type ExerciseChoice = "with" | "without";

export const NO_EXERCISE_FILTER: ExerciseFilter = { with: [], without: [] };

export function hasExerciseFilter(filter: ExerciseFilter): boolean {
  return filter.with.length > 0 || filter.without.length > 0;
}

/** The choice of an exercise, or `null` if the filter does not use it. */
export function choiceOf(filter: ExerciseFilter, id: ExerciseId): ExerciseChoice | null {
  if (filter.with.includes(id)) return "with";
  if (filter.without.includes(id)) return "without";
  return null;
}

/** Sets the choice of an exercise. `null` removes the exercise from the filter. */
export function choose(
  filter: ExerciseFilter,
  id: ExerciseId,
  choice: ExerciseChoice | null,
): ExerciseFilter {
  const rest = {
    with: filter.with.filter((item) => item !== id),
    without: filter.without.filter((item) => item !== id),
  };
  if (choice === null) return rest;
  // An exercise that keeps its choice keeps its place in the list.
  if (choiceOf(filter, id) === choice) return filter;
  return { ...rest, [choice]: [...rest[choice], id] };
}

/** The workouts with all exercises of "with" and none of "without". */
export function filterByExercises(workouts: readonly Workout[], filter: ExerciseFilter): Workout[] {
  return workouts.filter(
    (workout) =>
      filter.with.every((id) => workout.exercises.includes(id)) &&
      !filter.without.some((id) => workout.exercises.includes(id)),
  );
}

/** How many workouts use each exercise. Exercises without a workout are not in the map. */
export function exerciseCounts(workouts: readonly Workout[]): Map<ExerciseId, number> {
  const counts = new Map<ExerciseId, number>();
  for (const workout of workouts) {
    for (const id of new Set(workout.exercises)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** The groups of the exercise picker, in this order. */
export const EXERCISE_GROUPS = [
  {
    key: "barbell",
    title: "Langhantel",
    exercises: [
      "back-squat",
      "front-squat",
      "overhead-squat",
      "deadlift",
      "stiff-legged-deadlift",
      "sumo-deadlift-high-pull",
      "clean",
      "power-clean",
      "squat-clean",
      "hang-clean",
      "hang-power-clean",
      "clean-and-jerk",
      "snatch",
      "power-snatch",
      "squat-snatch",
      "hang-power-snatch",
      "thruster",
      "squat-clean-thruster",
      "shoulder-press",
      "push-press",
      "push-jerk",
      "split-jerk",
      "jerk",
      "shoulder-to-overhead",
      "ground-to-overhead",
      "bench-press",
      "overhead-lunge",
      "front-rack-lunge",
    ],
  },
  {
    key: "dumbbell",
    title: "Kurzhantel, Kettlebell & Ball",
    exercises: [
      "dumbbell-snatch",
      "alternating-dumbbell-snatch",
      "dumbbell-clean",
      "dumbbell-clean-and-jerk",
      "dumbbell-thruster",
      "dumbbell-squat",
      "dumbbell-deadlift",
      "dumbbell-burpee-deadlift",
      "dumbbell-floor-press",
      "dumbbell-row",
      "devil-press",
      "goblet-squat",
      "kettlebell-swing",
      "kettlebell-snatch",
      "kettlebell-clean-and-jerk",
      "kettlebell-thruster",
      "turkish-get-up",
      "wall-ball",
      "medicine-ball-clean",
      "ball-slam",
    ],
  },
  {
    key: "gymnastics",
    title: "Turnen & Körpergewicht",
    exercises: [
      "air-squat",
      "pistol",
      "lunge",
      "walking-lunge",
      "pull-up",
      "strict-pull-up",
      "chest-to-bar",
      "bar-muscle-up",
      "ring-muscle-up",
      "toes-to-bar",
      "knees-to-elbows",
      "hanging-hip-touch",
      "dead-hang",
      "push-up",
      "hand-release-push-up",
      "ring-push-up",
      "handstand-push-up",
      "strict-handstand-push-up",
      "ring-handstand-push-up",
      "handstand",
      "handstand-walk",
      "wall-walk",
      "ring-dip",
      "dip",
      "ring-row",
      "ring-lower",
      "l-sit",
      "rope-climb",
      "legless-rope-climb",
      "sit-up",
      "ghd-sit-up",
      "back-extension",
      "flutter-kick",
      "wall-sit",
      "burpee",
      "bar-facing-burpee",
      "burpee-over-bar",
      "burpee-over-dumbbell",
      "burpee-over-rower",
      "burpee-box-jump",
      "burpee-box-jump-over",
      "burpee-pull-up",
      "burpee-bar-muscle-up",
      "burpee-muscle-up",
      "burpee-to-target",
      "box-jump",
      "box-jump-over",
      "box-step-over",
      "step-up",
      "broad-jump",
      "jumping-jack",
      "single-under",
      "double-under",
      "triple-under",
      "bear-crawl",
      "forward-roll",
    ],
  },
  {
    key: "cardio",
    title: "Ausdauer",
    exercises: ["run", "shuttle-run", "row", "bike", "air-bike", "ski", "swim"],
  },
  {
    key: "carry",
    title: "Tragen & Sonstiges",
    exercises: [
      "farmers-carry",
      "front-rack-carry",
      "overhead-carry",
      "waiter-walk",
      "plate-carry",
      "sandbag-carry",
      "sandbag-over-shoulder",
      "partner-barbell-carry",
      "buddy-carry",
      "sled-push",
      "sled-pull",
    ],
  },
] as const satisfies readonly { key: string; title: string; exercises: readonly ExerciseId[] }[];

/** An exercise in the picker: its name and the number of workouts with it. */
export type ExerciseOption = { id: ExerciseId; name: string; count: number };

/**
 * The groups of the picker with the exercises that match the search text, sorted by name. An
 * exercise is in the picker if a workout has it, or if the filter uses it (then the user can
 * remove it). Empty groups are left out.
 */
export function exerciseOptions(
  counts: ReadonlyMap<ExerciseId, number>,
  search: string,
  filter: ExerciseFilter,
): { key: string; title: string; options: ExerciseOption[] }[] {
  const text = search.trim().toLocaleLowerCase("de");
  return EXERCISE_GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    options: group.exercises
      .map((id) => ({ id, name: EXERCISE_NAMES[id], count: counts.get(id) ?? 0 }))
      .filter(
        (option) =>
          (option.count > 0 || choiceOf(filter, option.id) !== null) &&
          option.name.toLocaleLowerCase("de").includes(text),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "de")),
  })).filter((group) => group.options.length > 0);
}
