import { yearOf } from "./returns.ts";
import type { Dividend, PricePoint } from "./schema.ts";

export type DividendSummary = {
  /** The sum of the dividends in the last 12 months, per share. */
  last12Months: number;
  /** `last12Months` divided by the last close: the dividend yield. */
  yield: number;
  /** The sum per calendar year, newest first. */
  byYear: { year: number; sum: number }[];
  /** The newest payments, newest first. */
  recent: Dividend[];
};

const RECENT_COUNT = 4;
const YEAR_COUNT = 5;

/** Key numbers of the dividends of an ETF. `null` if the ETF has no dividends. */
export function dividendSummary(
  dividends: readonly Dividend[],
  points: readonly PricePoint[],
  today: Date,
): DividendSummary | null {
  const last = points.at(-1);
  if (dividends.length === 0 || !last) return null;
  // Compare local days. `Date.parse` of a plain date gives UTC midnight.
  const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const last12Months = dividends
    .filter((dividend) => new Date(`${dividend.date}T00:00:00`) > yearAgo)
    .reduce((sum, dividend) => sum + dividend.amount, 0);
  const sums = new Map<number, number>();
  for (const dividend of dividends) {
    const year = yearOf(dividend.date);
    sums.set(year, (sums.get(year) ?? 0) + dividend.amount);
  }
  return {
    last12Months,
    yield: last12Months / last.close,
    byYear: [...sums]
      .map(([year, sum]) => ({ year, sum }))
      .sort((a, b) => b.year - a.year)
      .slice(0, YEAR_COUNT),
    recent: [...dividends].reverse().slice(0, RECENT_COUNT),
  };
}
