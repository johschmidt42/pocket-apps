import { CATALOG } from "./catalog.ts";
import { formatDecimal } from "./decimal.ts";
import { EXERCISE_NAMES, hasBox, inchesText, UNIT_LABELS, type ExerciseId } from "./exercises.ts";
import type { Logbook, OwnWorkout, Part, Result, ScoreType } from "./schema.ts";

export const CATEGORIES = ["girls", "hero", "open", "own"] as const;
export type Category = (typeof CATEGORIES)[number];

/** The choices of the category filter in the list. */
export const FILTERS = ["all", ...CATEGORIES] as const;
export type Filter = (typeof FILTERS)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  girls: "The Girls",
  hero: "Hero",
  open: "Open",
  own: "Eigene",
};

/**
 * One fixed chart color per category, in the order of the categories (see AGENTS.md):
 * `bg`, `tint` (a light area), `border`, `text` and `progress` (the bar of `Progress`) are full
 * Tailwind classes for HTML. `chart` is the CSS variable for SVG attributes.
 */
export const CATEGORY_COLORS: Record<
  Category,
  { bg: string; tint: string; border: string; text: string; progress: string; chart: string }
> = {
  girls: {
    bg: "bg-chart-1",
    tint: "bg-chart-1/10",
    border: "border-chart-1",
    text: "text-chart-1",
    progress: "[&_[data-slot=progress-indicator]]:bg-chart-1",
    chart: "var(--chart-1)",
  },
  hero: {
    bg: "bg-chart-2",
    tint: "bg-chart-2/10",
    border: "border-chart-2",
    text: "text-chart-2",
    progress: "[&_[data-slot=progress-indicator]]:bg-chart-2",
    chart: "var(--chart-2)",
  },
  open: {
    bg: "bg-chart-3",
    tint: "bg-chart-3/10",
    border: "border-chart-3",
    text: "text-chart-3",
    progress: "[&_[data-slot=progress-indicator]]:bg-chart-3",
    chart: "var(--chart-3)",
  },
  own: {
    bg: "bg-chart-4",
    tint: "bg-chart-4/10",
    border: "border-chart-4",
    text: "text-chart-4",
    progress: "[&_[data-slot=progress-indicator]]:bg-chart-4",
    chart: "var(--chart-4)",
  },
};

/** A built-in workout or an own workout, in one shape for the screens. */
export type Workout = {
  id: string;
  name: string;
  category: Category;
  scoreType: ScoreType;
  /** The time cap, or the length of an AMRAP or a max-reps workout. */
  timeCapMinutes: number | null;
  /** The prescription, one line per part. */
  lines: readonly string[];
  /** Extra notes of an own workout, one line each. Built-in workouts have them in `lines`. */
  notes?: readonly string[];
  exercises: readonly ExerciseId[];
};

/** The format in a few words, as in the gym: "For Time · Cap 12 min" or "AMRAP 20 min". */
export function formatLabel(workout: Workout): string {
  const minutes = workout.timeCapMinutes === null ? "" : `${String(workout.timeCapMinutes)} min`;
  switch (workout.scoreType) {
    case "time":
      return "For Time";
    case "time-or-reps":
      return minutes === "" ? "For Time" : `For Time · Cap ${minutes}`;
    case "rounds-reps":
      return minutes === "" ? "AMRAP" : `AMRAP ${minutes}`;
    case "reps":
      return minutes === "" ? "Max. Wiederholungen" : `Max. Wiederholungen · ${minutes}`;
    case "load":
      return "Max. Gewicht";
  }
}

/**
 * A value for men and women: "43", or the pair "43/29" if the value for women is not the same.
 * The pair has the form of the built-in workouts, so the switch "Männer | Frauen" shows one value
 * (see `showLine()`).
 */
function menWomen(men: number, women: number | null, format: (value: number) => string): string {
  return women === null ? format(men) : `${format(men)}/${format(women)}`;
}

/**
 * One part as a line: "21 × Thruster, 43/29 kg", "10 × Box Jump, 24/20 Zoll", "400 m Run" or
 * "Burpee".
 */
export function partLine(part: Part): string {
  const name = EXERCISE_NAMES[part.exercise];
  const amount =
    part.amount === null
      ? ""
      : part.unit === "reps"
        ? `${formatDecimal(part.amount)} × `
        : `${formatDecimal(part.amount)} ${UNIT_LABELS[part.unit].short} `;
  const kg = part.kg === null ? "" : `, ${menWomen(part.kg, part.kgWomen, formatDecimal)} kg`;
  // Data from before schema version 2 has no box height. The line says so: then the user adds it.
  const box = !hasBox(part.exercise)
    ? ""
    : part.boxInches === null
      ? ", Boxhöhe fehlt"
      : `, ${inchesText(menWomen(part.boxInches, part.boxInchesWomen, String))}`;
  return `${amount}${name}${kg}${box}`;
}

export function fromOwn(own: OwnWorkout): Workout {
  const notes = own.notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return {
    id: own.id,
    name: own.name,
    category: "own",
    scoreType: own.scoreType,
    timeCapMinutes: own.timeCapMinutes,
    lines: [
      ...(own.rounds === null ? [] : [`${String(own.rounds)} Runden:`]),
      ...own.parts.map(partLine),
    ],
    notes,
    exercises: [...new Set(own.parts.map((part) => part.exercise))],
  };
}

/** All workouts: the built-in workouts, then the own workouts. */
export function allWorkouts(data: Logbook): Workout[] {
  return [...CATALOG, ...data.workouts.map(fromOwn)];
}

/** The results of one workout, newest first. */
export function resultsOf(data: Logbook, workoutId: string): Result[] {
  return newestFirst(data.results.filter((result) => result.workoutId === workoutId));
}

/** Newest date first. Same date: the later entry first. */
export function newestFirst(results: readonly Result[]): Result[] {
  return results
    .map((result, index) => ({ result, index }))
    .sort((a, b) => b.result.date.localeCompare(a.result.date) || b.index - a.index)
    .map(({ result }) => result);
}

/**
 * The workouts that match the search text, in the order of the list. The search looks at
 * the name, the prescription and the exercise names. Case does not matter.
 */
export function searchWorkouts(workouts: readonly Workout[], text: string): Workout[] {
  const words = text.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...workouts];
  return workouts.filter((workout) => {
    const exercises = workout.exercises.map((id) => EXERCISE_NAMES[id]);
    const haystack = [workout.name, ...workout.lines, ...(workout.notes ?? []), ...exercises]
      .join(" ")
      .toLocaleLowerCase("de");
    return words.every((word) => haystack.includes(word));
  });
}

/** The year of an Open workout from its name ("Open 24.1" → 2024), else `null`. */
export function openYear(workout: Workout): number | null {
  const match = /^Open (\d{2})\./.exec(workout.name);
  return match ? 2000 + Number(match[1]) : null;
}

/** The choices of the status filter: all workouts, the done ones or the open ones. */
export const STATUS_FILTERS = ["all", "done", "open"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** The workouts with the status. "done": the workout has at least one result. */
export function filterByStatus(
  workouts: readonly Workout[],
  results: readonly Result[],
  status: StatusFilter,
): Workout[] {
  if (status === "all") return [...workouts];
  const done = new Set(results.map((result) => result.workoutId));
  return workouts.filter((workout) => done.has(workout.id) === (status === "done"));
}

/** A section of the workout list. */
export type WorkoutGroup = {
  key: string;
  title: string;
  category: Category;
  workouts: Workout[];
};

/**
 * The sections of the list: The Girls, Hero, Open (one section per year, newest year
 * first) and the own workouts. Empty sections are left out.
 */
export function groupWorkouts(workouts: readonly Workout[]): WorkoutGroup[] {
  const groups: WorkoutGroup[] = [];
  for (const category of CATEGORIES) {
    const items = workouts.filter((workout) => workout.category === category);
    if (category !== "open") {
      groups.push({ key: category, title: CATEGORY_LABELS[category], category, workouts: items });
      continue;
    }
    const years = [...new Set(items.map(openYear))].sort((a, b) => (b ?? 0) - (a ?? 0));
    for (const year of years) {
      groups.push({
        key: `open-${String(year)}`,
        title: year === null ? CATEGORY_LABELS.open : `${CATEGORY_LABELS.open} ${String(year)}`,
        category,
        workouts: items.filter((workout) => openYear(workout) === year),
      });
    }
  }
  return groups.filter((group) => group.workouts.length > 0);
}

/** Adds the item at the end, or replaces the item with the same ID. */
function upsertById<T extends { id: string }>(list: readonly T[], item: T): T[] {
  return list.some((entry) => entry.id === item.id)
    ? list.map((entry) => (entry.id === item.id ? item : entry))
    : [...list, item];
}

export function upsertResult(data: Logbook, result: Result): Logbook {
  return { ...data, results: upsertById(data.results, result) };
}

export function removeResult(data: Logbook, id: string): Logbook {
  return { ...data, results: data.results.filter((result) => result.id !== id) };
}

export function upsertWorkout(data: Logbook, workout: OwnWorkout): Logbook {
  return { ...data, workouts: upsertById(data.workouts, workout) };
}

/** Removes an own workout and all its results. */
export function removeWorkout(data: Logbook, id: string): Logbook {
  return {
    ...data,
    workouts: data.workouts.filter((workout) => workout.id !== id),
    results: data.results.filter((result) => result.workoutId !== id),
  };
}

/** The question before the app removes an own workout with its results. */
export function removeQuestion(name: string, resultCount: number): string {
  if (resultCount === 0) return `„${name}“ löschen?`;
  const results = resultCount === 1 ? "sein Ergebnis" : `seine ${String(resultCount)} Ergebnisse`;
  return `„${name}“ und ${results} löschen?`;
}

/** A random ID. Works without a secure context. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
