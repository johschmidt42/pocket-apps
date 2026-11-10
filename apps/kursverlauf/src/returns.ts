import type { PricePoint } from "./schema.ts";

export type YearReturn = {
  year: number;
  /** The change in the year, as a fraction (0.12 = +12 %). */
  change: number;
  /** The year is not complete: the first year of the data, or the current year. */
  partial: boolean;
};

/** The year of an ISO date: "2026-11-09" → 2026. */
export function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

/** The average needs at least 1 year of data. Over a shorter time, a small change gives an absurd yearly value. */
const MIN_YEARS_FOR_AVERAGE = 1;

/**
 * The change in each calendar year: from the last close of the year before to the last close of the year.
 * The first year starts at the first close. The points must be sorted, oldest first.
 */
export function yearlyReturns(points: readonly PricePoint[], today: Date): YearReturn[] {
  const lastOfYear = new Map<number, PricePoint>();
  for (const point of points) lastOfYear.set(yearOf(point.date), point);
  const [first] = points;
  if (!first) return [];
  const results: YearReturn[] = [];
  for (const [year, end] of lastOfYear) {
    const before = lastOfYear.get(year - 1);
    const start = before ?? first;
    results.push({
      year,
      change: end.close / start.close - 1,
      partial: before === undefined || year === today.getFullYear(),
    });
  }
  return results;
}

/**
 * The average return per year from the first to the last close (compound annual growth rate).
 * `null` for less than 1 year of data.
 */
export function averageReturn(
  points: readonly PricePoint[],
): { rate: number; since: string } | null {
  const [first] = points;
  const last = points.at(-1);
  if (!first || !last) return null;
  const years = (Date.parse(last.date) - Date.parse(first.date)) / (365.25 * 86_400_000);
  if (years < MIN_YEARS_FOR_AVERAGE) return null;
  return { rate: (last.close / first.close) ** (1 / years) - 1, since: first.date };
}
