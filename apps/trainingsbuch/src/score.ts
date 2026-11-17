import { parseNumber } from "@pocket-apps/core/numbers";
import { decimalInput, formatDecimal } from "./decimal.ts";
import type { Division, Result, Score, ScoreType } from "./schema.ts";

/** German labels of the score types, for selects and hints. */
export const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  time: "Zeit (For Time)",
  "time-or-reps": "Zeit mit Time Cap",
  "rounds-reps": "Runden + Wiederholungen (AMRAP)",
  reps: "Wiederholungen",
  load: "Gewicht (kg)",
};

export const DIVISION_LABELS: Record<Division, string> = { rx: "Rx", scaled: "Scaled" };

/** "4:05" or "1:02:05". */
export function formatSeconds(total: number): string {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours === 0) return `${String(minutes)}:${ss}`;
  return `${String(hours)}:${String(minutes).padStart(2, "0")}:${ss}`;
}

/** "102,5 kg". */
export function formatKg(kg: number): string {
  return `${formatDecimal(kg)} kg`;
}

/** The score as German text, for example "4:05", "12 Runden + 5 Wdh." or "100 kg". */
export function formatScore(score: Score): string {
  switch (score.kind) {
    case "time":
      return formatSeconds(score.seconds);
    case "reps":
      return `${String(score.reps)} Wdh.`;
    case "rounds-reps":
      return score.reps === 0
        ? `${String(score.rounds)} Runden`
        : `${String(score.rounds)} Runden + ${String(score.reps)} Wdh.`;
    case "load":
      return formatKg(score.kg);
  }
}

/**
 * The score as one number, larger is better. A finished time beats every
 * capped result (reps). A faster time is better.
 */
function rank(score: Score): number {
  switch (score.kind) {
    case "time":
      return 1e9 - score.seconds;
    case "reps":
      return score.reps;
    case "rounds-reps":
      return score.rounds * 10_000 + score.reps;
    case "load":
      return score.kg;
  }
}

/**
 * Negative if `a` is better than `b`, positive if `b` is better, 0 if equal.
 * Rx is better than Scaled. A result without a mark counts as Rx: nothing was scaled.
 * Then the score decides.
 */
export function compareResults(a: Result, b: Result): number {
  const scaled = (result: Result) => (result.division === "scaled" ? 1 : 0);
  if (scaled(a) !== scaled(b)) return scaled(a) - scaled(b);
  return rank(b.score) - rank(a.score);
}

/** The best result, or `null` for no results. The earlier result wins a tie. */
export function bestResult(results: readonly Result[]): Result | null {
  let best: Result | null = null;
  for (const result of results) {
    if (best === null) {
      best = result;
      continue;
    }
    const order = compareResults(result, best);
    if (order < 0 || (order === 0 && result.date < best.date)) best = result;
  }
  return best;
}

/** A whole number ≥ 0 from an input, or `null`. An empty input is 0 when `emptyIsZero`. */
export function parseCount(text: string, emptyIsZero = false): number | null {
  if (text.trim() === "") return emptyIsZero ? 0 : null;
  const value = parseNumber(text);
  if (value === null || value < 0 || !Number.isInteger(value)) return null;
  return value;
}

/** Seconds from the inputs for minutes and seconds, or `null`. The time must be more than 0. */
export function parseTime(minutes: string, seconds: string): number | null {
  if (minutes.trim() === "" && seconds.trim() === "") return null;
  const mm = parseCount(minutes, true);
  const ss = parseCount(seconds, true);
  if (mm === null || ss === null || ss > 59) return null;
  const total = mm * 60 + ss;
  return total > 0 ? total : null;
}

/** A weight in kg > 0 from a German input ("102,5"), or `null`. */
export function parseKg(text: string): number | null {
  const value = parseNumber(text);
  if (value === null || value <= 0 || value > 1000) return null;
  return Math.round(value * 100) / 100;
}

/** The text of the score inputs in the result form. */
export type ScoreInput = {
  minutes: string;
  seconds: string;
  /** Only for `time-or-reps`: the time cap ended the workout. */
  capped: boolean;
  rounds: string;
  reps: string;
  kg: string;
};

export type ScoreCheck = { kind: "ok"; score: Score } | { kind: "error"; message: string };

const TIME_ERROR = "Bitte eine Zeit eingeben, z. B. 4 Minuten und 5 Sekunden.";
const REPS_ERROR = "Bitte die Wiederholungen als ganze Zahl eingeben.";

/** The score from the form inputs, or a German error message. */
export function scoreFromInput(type: ScoreType, input: ScoreInput): ScoreCheck {
  switch (type) {
    case "time":
      return timeScore(input);
    case "time-or-reps":
      return input.capped ? repsScore(input) : timeScore(input);
    case "reps":
      return repsScore(input);
    case "rounds-reps": {
      const rounds = parseCount(input.rounds);
      const reps = parseCount(input.reps, true);
      if (rounds === null)
        return { kind: "error", message: "Bitte die Runden als ganze Zahl eingeben." };
      if (reps === null) return { kind: "error", message: REPS_ERROR };
      return { kind: "ok", score: { kind: "rounds-reps", rounds, reps } };
    }
    case "load": {
      const kg = parseKg(input.kg);
      if (kg === null)
        return { kind: "error", message: "Bitte ein Gewicht in kg eingeben, z. B. 102,5." };
      return { kind: "ok", score: { kind: "load", kg } };
    }
  }
}

function timeScore(input: ScoreInput): ScoreCheck {
  const seconds = parseTime(input.minutes, input.seconds);
  return seconds === null
    ? { kind: "error", message: TIME_ERROR }
    : { kind: "ok", score: { kind: "time", seconds } };
}

function repsScore(input: ScoreInput): ScoreCheck {
  const reps = parseCount(input.reps);
  return reps === null
    ? { kind: "error", message: REPS_ERROR }
    : { kind: "ok", score: { kind: "reps", reps } };
}

/** The form inputs for a saved score, or empty inputs for `null`. */
export function inputFromScore(score: Score | null): ScoreInput {
  const empty: ScoreInput = {
    minutes: "",
    seconds: "",
    capped: false,
    rounds: "",
    reps: "",
    kg: "",
  };
  if (score === null) return empty;
  switch (score.kind) {
    case "time":
      return {
        ...empty,
        minutes: String(Math.floor(score.seconds / 60)),
        seconds: String(score.seconds % 60),
      };
    case "reps":
      return { ...empty, capped: true, reps: String(score.reps) };
    case "rounds-reps":
      return { ...empty, rounds: String(score.rounds), reps: String(score.reps) };
    case "load":
      return { ...empty, kg: decimalInput(score.kg) };
  }
}
