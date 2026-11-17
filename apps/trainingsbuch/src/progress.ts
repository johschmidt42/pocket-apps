import { formatAxisDay } from "./dates.ts";
import type { Division, Result, Score } from "./schema.ts";
import { bestResult, formatScore } from "./score.ts";

/** One point of the progress chart. */
export type ProgressPoint = {
  id: string;
  day: string;
  value: number;
  label: string;
  division: Division | null;
};

export type Progress = {
  /** Oldest first. */
  points: ProgressPoint[];
  /** True for times: then the chart turns its axis so that up is better. */
  lowerIsBetter: boolean;
};

function progressValue(score: Score): number {
  switch (score.kind) {
    case "time":
      return score.seconds;
    case "reps":
      return score.reps;
    case "rounds-reps":
      // A round counts more than any number of extra reps.
      return score.rounds + score.reps / 1000;
    case "load":
      return score.kg;
  }
}

/**
 * The points for the progress chart, or `null` for fewer than 2 points. The chart shows
 * only the results with the same kind of score as the best result.
 */
export function progressPoints(results: readonly Result[]): Progress | null {
  const kind = bestResult(results)?.score.kind;
  const same = results
    .filter((result) => result.score.kind === kind)
    .map((result, index) => ({ result, index }))
    .sort((a, b) => a.result.date.localeCompare(b.result.date) || a.index - b.index);
  if (same.length < 2) return null;
  return {
    points: same.map(({ result }) => ({
      id: result.id,
      day: formatAxisDay(result.date),
      value: progressValue(result.score),
      label: formatScore(result.score),
      division: result.division,
    })),
    lowerIsBetter: kind === "time",
  };
}
