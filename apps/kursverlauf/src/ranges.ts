import type { PricePoint } from "./schema.ts";

export const RANGES = ["6m", "1y", "3y", "5y", "max"] as const;
export type Range = (typeof RANGES)[number];

export const RANGE_LABELS: Record<Range, string> = {
  "6m": "6 Monate",
  "1y": "1 Jahr",
  "3y": "3 Jahre",
  "5y": "5 Jahre",
  max: "Max",
};

const MONTHS: Record<Exclude<Range, "max">, number> = { "6m": 6, "1y": 12, "3y": 36, "5y": 60 };

/** The first day of the range, as an ISO date. `null` for "max". */
export function rangeStart(range: Range, today: Date): string | null {
  if (range === "max") return null;
  const year = today.getFullYear();
  const monthIndex = today.getMonth() - MONTHS[range];
  // The 31st of a month that has 30 days is the 30th, not the 1st of the next month.
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const start = new Date(year, monthIndex, Math.min(today.getDate(), lastDay));
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${String(start.getFullYear())}-${month}-${day}`;
}

/** The points of the range. The points must be sorted, oldest first. */
export function pointsInRange(
  points: readonly PricePoint[],
  range: Range,
  today: Date,
): PricePoint[] {
  const start = rangeStart(range, today);
  return start === null ? [...points] : points.filter((point) => point.date >= start);
}

export type RangeStats = {
  first: PricePoint;
  last: PricePoint;
  /** The change from the first to the last point, as a fraction (0.12 = +12 %). */
  change: number;
  high: PricePoint;
  low: PricePoint;
};

/** Key numbers of the points of a range. `null` without points. */
export function rangeStats(points: readonly PricePoint[]): RangeStats | null {
  const [first] = points;
  const last = points.at(-1);
  if (!first || !last) return null;
  let high = first;
  let low = first;
  for (const point of points) {
    if (point.close > high.close) high = point;
    if (point.close < low.close) low = point;
  }
  return { first, last, change: last.close / first.close - 1, high, low };
}

export type ComparisonRow = { date: string } & Record<string, number | string>;

type Series = { key: string; points: readonly PricePoint[] };

/** The first date that all series have: the latest of their first dates. `null` without points. */
export function commonStart(series: readonly Series[]): string | null {
  const firsts = series.map((item) => item.points[0]?.date).filter((date) => date !== undefined);
  return firsts.length === 0
    ? null
    : firsts.reduce((latest, date) => (date > latest ? date : latest));
}

/** The points from the common start on. Thus all series compare the same time. */
function fromCommonStart(series: readonly Series[]): Series[] {
  const start = commonStart(series);
  return series.map((item) => ({
    key: item.key,
    points: start === null ? [] : item.points.filter((point) => point.date >= start),
  }));
}

/**
 * One row per date with the change of each ETF since the common start, in percent.
 * Each series starts at 0 %. Dates that only some ETFs have get only their values.
 */
export function comparisonRows(series: readonly Series[]): ComparisonRow[] {
  const rows = new Map<string, ComparisonRow>();
  for (const { key, points } of fromCommonStart(series)) {
    const [first] = points;
    if (!first) continue;
    for (const point of points) {
      const row = rows.get(point.date) ?? { date: point.date };
      row[key] = (point.close / first.close - 1) * 100;
      rows.set(point.date, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** The change of each series from the common start to its last point, as a fraction. */
export function comparisonChanges(series: readonly Series[]): { key: string; change: number }[] {
  return fromCommonStart(series).flatMap(({ key, points }) => {
    const [first] = points;
    const last = points.at(-1);
    return first && last ? [{ key, change: last.close / first.close - 1 }] : [];
  });
}
