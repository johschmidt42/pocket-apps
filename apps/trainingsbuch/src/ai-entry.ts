// The logic of "Mit KI eintragen": the shape of the AI answer, the instructions for the AI and
// the check of a draft. The dialog is in ai-entry-dialog.tsx.
import { z } from "zod";
import { EXERCISE_IDS, hasBox, isWeighted, UNITS, unitsOf } from "./exercises.ts";
import {
  DIVISIONS,
  SCORE_TYPES,
  type Logbook,
  type OwnWorkout,
  type Result,
  type Score,
  type ScoreType,
  type UnitSystem,
} from "./schema.ts";
import { allWorkouts, fromOwn, newId, type Workout } from "./workouts.ts";

// The schema has no limits such as `.min()` or `.positive()`: not all providers accept them in
// the JSON schema of the answer. `checkDraft()` checks the values.
const count = z.number().int().nullable();

const newWorkoutSchema = z.object({
  name: z.string().describe("A short name, not the name of a workout in the list."),
  scoreType: z.enum(SCORE_TYPES),
  timeCapMinutes: count.describe(
    "Required for time-or-reps. The length of an AMRAP or a max-reps workout. Else null.",
  ),
  rounds: count.describe("How often the parts repeat. null: once, or an AMRAP."),
  parts: z.array(
    z.object({
      exercise: z.enum(EXERCISE_IDS),
      amount: z.number().nullable().describe("Reps, meters, calories or seconds. null: max."),
      unit: z.enum(UNITS),
      kg: z.number().nullable().describe("The load in kg. Only for an exercise with a weight."),
      boxInches: count.describe(
        "Only for an exercise with a box: the box height in inches, for example 24 or 30. Else null.",
      ),
    }),
  ),
  notes: z.string().describe("Other details of the workout, in German. Can be empty."),
});

const draftSchema = z.object({
  workoutId: z
    .string()
    .nullable()
    .describe("The id of the workout in the list. null for a new workout."),
  newWorkout: newWorkoutSchema
    .nullable()
    .describe("Only if the workout is not in the list. Else null."),
  date: z.string().describe("The day of the workout: YYYY-MM-DD."),
  division: z.enum(DIVISIONS).nullable().describe("null if the workout has no prescribed load."),
  score: z.object({
    seconds: count.describe("The time in seconds, for time and for time-or-reps."),
    capped: z.boolean().describe("time-or-reps only: true if the user did not finish in the cap."),
    rounds: count.describe("rounds-reps only: the full rounds."),
    reps: count.describe("reps, rounds-reps (the extra reps) and capped time-or-reps."),
    kg: z.number().nullable().describe("load only: the heaviest weight in kg."),
  }),
  loadKg: z
    .number()
    .nullable()
    .describe("The weight that the user moved in kg, if the score is not a weight. Else null."),
  notes: z.string().describe("Details of the result in German, for example sets or scaling."),
});

/** The answer of the AI in each round: a question to the user, or a draft of the entry. */
export const aiAnswerSchema = z.object({
  status: z.enum(["question", "draft"]),
  message: z
    .string()
    .describe("German text to the user: the question, or a short summary of the draft."),
  draft: draftSchema.nullable().describe("null for a question."),
});

export type AiAnswer = z.infer<typeof aiAnswerSchema>;
export type AiDraft = z.infer<typeof draftSchema>;

/** A checked draft: the workout, a new own workout (or `null`) and the result. */
export type AiEntry = { workout: Workout; newWorkout: OwnWorkout | null; result: Result };

export type DraftCheck = { kind: "ok"; entry: AiEntry } | { kind: "problem"; problem: string };

const SCORING: Record<ScoreType, string> = {
  time: "for time",
  "time-or-reps": "for time with time cap",
  "rounds-reps": "AMRAP (rounds + reps)",
  reps: "max reps",
  load: "max load",
};

function scoring(workout: Workout): string {
  const minutes = workout.timeCapMinutes === null ? "" : ` ${String(workout.timeCapMinutes)} min`;
  return `${SCORING[workout.scoreType]}${minutes}`;
}

/** One workout in the list for the AI: "fran · Fran · for time · thruster, pull-up". */
export function workoutLine(workout: Workout): string {
  return [workout.id, workout.name, scoring(workout), workout.exercises.join(", ")].join(" · ");
}

function weekday(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "long" });
}

export type InstructionsInput = {
  /** The day of today: YYYY-MM-DD. */
  today: string;
  units: UnitSystem;
  workouts: readonly Workout[];
  /** The workout that the user opened, or `null` (start from the list). */
  focus: Workout | null;
};

/**
 * The instructions for the AI. The app makes them once when the dialog opens. They stay the same
 * in all rounds, so that the provider can keep them in its cache.
 */
export function buildInstructions({ today, units, workouts, focus }: InstructionsInput): string {
  const workoutPart = focus
    ? [
        `The user did this workout. Use workoutId "${focus.id}" and newWorkout null:`,
        `${focus.name} · ${scoring(focus)}`,
        ...focus.lines,
        ...(focus.notes ?? []),
      ]
    : [
        "Known workouts (id · name · scoring · exercises):",
        ...workouts.map(workoutLine),
        "",
        "If the workout is not in the list, say in the message that you do not know it and that",
        "you create it as a new own workout. Then give newWorkout and set workoutId to null.",
        "Use the title from the input as its name, for example the title on the whiteboard.",
        "Only without a title, make a short name from the format and the exercises.",
      ];
  return [
    "You record one workout result in the training log of the user.",
    `Today is ${weekday(today)}, ${today}.`,
    units === "metric"
      ? "The user thinks in kg."
      : "The user thinks in lb. Convert lb to kg in all kg fields (1 lb = 0.4536 kg).",
    "",
    ...workoutPart,
    "",
    "Rules:",
    "- Record exactly one result. If the input shows more than one workout, take the main",
    "  workout and say in the message which one you took.",
    "- Rx means: as written, with the loads for men. Scaled means: with changes.",
    "- Ask when a value is missing that the result needs: the score, or Rx or Scaled for a",
    "  workout with a prescribed load. Ask only one short question at a time.",
    "- Never invent a value. If the user does not say the day, use today.",
    "- Use only exercises from the schema. If an exercise does not fit, ask the user which",
    "  exercise is right.",
    "- Box heights are in inches (Zoll), never in cm. Take the box height of a new workout",
    "  from the input. If the input does not give it, ask the user (Rx for men: 24 or 30 in).",
    "- Put details of the result into the notes, for example sets, scaling or how it felt.",
    "- Write all text for the user in German: short, friendly, with du.",
    "- When the user corrects a value, give the full draft again.",
  ].join("\n");
}

/** The message to the AI when its draft has a problem. The user does not see it. */
export function fixRequest(problem: string): string {
  return `The app cannot use your draft: ${problem} Give a corrected answer.`;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isValidDay(text: string): boolean {
  if (!ISO_DAY.test(text)) return false;
  const [year = 0, month = 1, day = 1] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isCount(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value >= 0;
}

function isPositive(value: number | null): value is number {
  return value !== null && value > 0;
}

function scoreOf(workout: Workout, score: AiDraft["score"]): Score | string {
  const time = (): Score | string =>
    isCount(score.seconds) && score.seconds > 0
      ? { kind: "time", seconds: score.seconds }
      : `${workout.name} is scored by time. Give the time in seconds.`;
  const reps = (): Score | string =>
    isCount(score.reps)
      ? { kind: "reps", reps: score.reps }
      : `${workout.name} needs the reps as a whole number.`;
  switch (workout.scoreType) {
    case "time":
      return time();
    case "time-or-reps":
      return score.capped ? reps() : time();
    case "reps":
      return reps();
    case "rounds-reps":
      return isCount(score.rounds) && (score.reps === null || isCount(score.reps))
        ? { kind: "rounds-reps", rounds: score.rounds, reps: score.reps ?? 0 }
        : `${workout.name} is scored by rounds and reps. Give the full rounds and the extra reps.`;
    case "load":
      return isPositive(score.kg)
        ? { kind: "load", kg: score.kg }
        : `${workout.name} is scored by the heaviest load. Give it in kg.`;
  }
}

function checkNewWorkout(
  draft: NonNullable<AiDraft["newWorkout"]>,
  takenNames: readonly string[],
): OwnWorkout | string {
  const name = draft.name.trim();
  if (name === "") return "The new workout needs a name.";
  if (takenNames.some((taken) => taken.toLowerCase() === name.toLowerCase())) {
    return `The name "${name}" is taken. Choose another name.`;
  }
  if (draft.parts.length === 0) return "The new workout needs at least one exercise.";
  for (const part of draft.parts) {
    if (!unitsOf(part.exercise).includes(part.unit)) {
      return `${part.exercise} takes only these units: ${unitsOf(part.exercise).join(", ")}.`;
    }
    if (part.amount !== null && !isPositive(part.amount)) {
      return `The amount of ${part.exercise} must be more than 0, or null.`;
    }
    if (part.kg !== null && isWeighted(part.exercise) && !isPositive(part.kg)) {
      return `The load of ${part.exercise} must be more than 0 kg, or null.`;
    }
    if (hasBox(part.exercise) && !(isCount(part.boxInches) && part.boxInches > 0)) {
      return `${part.exercise} needs boxInches: the box height in inches, for example 24 or 30. Ask the user if the input does not say it.`;
    }
  }
  const cap =
    isCount(draft.timeCapMinutes) && draft.timeCapMinutes > 0 ? draft.timeCapMinutes : null;
  if (draft.scoreType === "time-or-reps" && cap === null) {
    return "A workout for time with time cap needs timeCapMinutes as a whole number.";
  }
  // Only these score types have a time cap or a length (see schema.ts).
  const usesCap = draft.scoreType !== "time" && draft.scoreType !== "load";
  const rounds =
    draft.scoreType !== "rounds-reps" && isCount(draft.rounds) && draft.rounds > 1
      ? draft.rounds
      : null;
  return {
    id: newId(),
    name,
    scoreType: draft.scoreType,
    timeCapMinutes: usesCap ? cap : null,
    rounds,
    parts: draft.parts.map((part) => ({
      id: newId(),
      exercise: part.exercise,
      amount: part.amount,
      unit: part.unit,
      // An exercise without a weight has no kg, also if the AI gives one. The same for a box.
      kg: isWeighted(part.exercise) ? part.kg : null,
      boxInches: hasBox(part.exercise) ? part.boxInches : null,
    })),
    notes: draft.notes.trim(),
  };
}

export type DraftContext = {
  data: Logbook;
  /** The workout that the user opened, or `null`. */
  focus: Workout | null;
  /** The day of today: YYYY-MM-DD. */
  today: string;
};

/**
 * Checks a draft of the AI and makes the entry. The AI can make mistakes: a wrong ID, a score
 * that does not fit the workout or a day in the future. Then the problem goes back to the AI
 * (in English, like the instructions).
 */
export function checkDraft(draft: AiDraft, { data, focus, today }: DraftContext): DraftCheck {
  const workouts = allWorkouts(data);
  let workout: Workout;
  let newWorkout: OwnWorkout | null = null;
  // With an open workout, the result is always for this workout.
  const known = focus ?? workouts.find((item) => item.id === draft.workoutId);
  if (known) {
    workout = known;
  } else if (draft.workoutId !== null) {
    return {
      kind: "problem",
      problem: `There is no workout with the id "${draft.workoutId}". Use an id from the list, or set workoutId to null and give newWorkout.`,
    };
  } else if (draft.newWorkout === null) {
    return { kind: "problem", problem: "Give a workoutId from the list or a newWorkout." };
  } else {
    const checked = checkNewWorkout(
      draft.newWorkout,
      workouts.map((item) => item.name),
    );
    if (typeof checked === "string") return { kind: "problem", problem: checked };
    newWorkout = checked;
    workout = fromOwn(checked);
  }

  if (!isValidDay(draft.date)) {
    return { kind: "problem", problem: `"${draft.date}" is not a day in the form YYYY-MM-DD.` };
  }
  if (draft.date > today) {
    return { kind: "problem", problem: `The day ${draft.date} is in the future.` };
  }
  const score = scoreOf(workout, draft.score);
  if (typeof score === "string") return { kind: "problem", problem: score };
  if (
    score.kind === "time" &&
    workout.scoreType === "time-or-reps" &&
    workout.timeCapMinutes !== null &&
    score.seconds > workout.timeCapMinutes * 60
  ) {
    return {
      kind: "problem",
      problem: `The time is longer than the time cap of ${String(workout.timeCapMinutes)} minutes. If the user did not finish, set capped to true and give the reps.`,
    };
  }
  // A built-in workout with a weight has a prescribed load. Without a mark, a scaled result could
  // count as the best result (no mark counts as Rx).
  if (
    draft.division === null &&
    workout.category !== "own" &&
    workout.exercises.some((exercise) => isWeighted(exercise))
  ) {
    return {
      kind: "problem",
      problem: `${workout.name} has a prescribed load. Ask the user if the result was Rx or Scaled.`,
    };
  }
  if (draft.loadKg !== null && !isPositive(draft.loadKg)) {
    return { kind: "problem", problem: "loadKg must be more than 0, or null." };
  }

  return {
    kind: "ok",
    entry: {
      workout,
      newWorkout,
      result: {
        id: newId(),
        workoutId: workout.id,
        date: draft.date,
        division: draft.division,
        score,
        loadKg: workout.scoreType === "load" ? null : draft.loadKg,
        notes: draft.notes.trim(),
      },
    },
  };
}
