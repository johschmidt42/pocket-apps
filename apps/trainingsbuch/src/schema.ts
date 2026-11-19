import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";
import { EXERCISE_IDS, UNITS } from "./exercises.ts";
import { toV2 } from "./migrations/to-v2.ts";
import { toV3 } from "./migrations/to-v3.ts";

/**
 * How a workout is scored:
 * - `time`: for time, no time cap.
 * - `time-or-reps`: for time with a time cap. Not finished: the reps at the cap.
 * - `rounds-reps`: as many rounds as possible (AMRAP): rounds plus extra reps.
 * - `reps`: the total reps.
 * - `load`: the heaviest weight.
 */
export const SCORE_TYPES = ["time", "time-or-reps", "rounds-reps", "reps", "load"] as const;
export const DIVISIONS = ["rx", "scaled"] as const;
/** How the texts of the built-in workouts show loads and distances: kg and m, or lb and ft. */
export const UNIT_SYSTEMS = ["metric", "imperial"] as const;
/** Which value of a pair "43/29 kg" the texts of the built-in workouts show: men or women. */
export const LOADS_FOR = ["men", "women"] as const;

const count = z.number().int().min(0);

const scoreSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("time"), seconds: z.number().int().positive() }),
  z.object({ kind: z.literal("reps"), reps: count }),
  z.object({ kind: z.literal("rounds-reps"), rounds: count, reps: count }),
  z.object({ kind: z.literal("load"), kg: z.number().positive() }),
]);

const resultSchema = z.object({
  id: z.string().min(1),
  /** The ID of a built-in workout (for example "fran") or of an own workout. */
  workoutId: z.string().min(1),
  date: z.iso.date(),
  /**
   * Rx: as prescribed. Scaled: with changes, for example a lighter weight. `null`: no mark,
   * for example for an own workout without a prescribed weight.
   */
  division: z.enum(DIVISIONS).nullable(),
  score: scoreSchema,
  /** The weight that the user moved, if the score is not a weight. */
  loadKg: z.number().positive().nullable(),
  notes: z.string(),
});

/** One exercise of an own workout, for example "21 × Thruster, 43 kg". */
const partSchema = z.object({
  id: z.string().min(1),
  exercise: z.enum(EXERCISE_IDS),
  /** Reps, meters, calories or seconds. `null`: no amount (for example "max reps"). */
  amount: z.number().positive().nullable(),
  unit: z.enum(UNITS),
  /** Only for exercises with a weight. */
  kg: z.number().positive().nullable(),
  /** Only for exercises with a box: its height in inches. `null` in data from before version 2. */
  boxInches: z.number().int().positive().nullable(),
});

const ownWorkoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  scoreType: z.enum(SCORE_TYPES),
  /**
   * The time cap of `time-or-reps` (required), or the length of `rounds-reps` and `reps`
   * (optional). `null` for the other score types.
   */
  timeCapMinutes: z.number().int().positive().nullable(),
  /** How often the parts repeat. `null`: once, or the score type says it (AMRAP). */
  rounds: z.number().int().positive().nullable(),
  /** The exercises in their order. */
  parts: z.array(partSchema),
  notes: z.string(),
});

const logbookSchema = z.object({
  /** The own workouts of the user. The built-in workouts are in the code. */
  workouts: z.array(ownWorkoutSchema),
  results: z.array(resultSchema),
  units: z.enum(UNIT_SYSTEMS).default("metric"),
  loadsFor: z.enum(LOADS_FOR),
});

export type ScoreType = (typeof SCORE_TYPES)[number];
export type Division = (typeof DIVISIONS)[number];
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];
export type LoadsFor = (typeof LOADS_FOR)[number];
export type Score = z.infer<typeof scoreSchema>;
export type Result = z.infer<typeof resultSchema>;
export type Part = z.infer<typeof partSchema>;
export type OwnWorkout = z.infer<typeof ownWorkoutSchema>;
export type Logbook = z.infer<typeof logbookSchema>;

export const schema = defineDataSchema<Logbook>({
  app: "trainingsbuch",
  validate: logbookSchema,
  initial: () => ({ workouts: [], results: [], units: "metric", loadsFor: "men" }),
  // Append new migrations at the end. Never change old ones.
  migrations: [toV2, toV3],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
