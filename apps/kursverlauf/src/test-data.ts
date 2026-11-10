import type { FetchJson, FetchResult } from "./fetch-json.ts";
import type { PricePoint } from "./schema.ts";

type Week = { date: string; close: number; adjusted?: number };

/** A weekly answer of Alpha Vantage. Without `adjusted`, the adjusted close is the close. */
export function weeklyJson(weeks: readonly Week[]): unknown {
  return {
    "Meta Data": { "2. Symbol": "TEST.DEX" },
    "Weekly Adjusted Time Series": Object.fromEntries(
      weeks.map((week) => [
        week.date,
        {
          "1. open": String(week.close),
          "4. close": week.close.toFixed(4),
          "5. adjusted close": (week.adjusted ?? week.close).toFixed(4),
          "7. dividend amount": "0.0000",
        },
      ]),
    ),
  };
}

/** An ISO date `days` days before `from` (local time). */
export function daysAgo(days: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** One week per point, the newest today, with rising prices from `start`. */
export function weeksUntilToday(count: number, start: number, step: number): Week[] {
  return Array.from({ length: count }, (_, index) => ({
    date: daysAgo((count - 1 - index) * 7),
    close: start + index * step,
  }));
}

export const point = (date: string, close: number, total = close): PricePoint => ({
  date,
  close,
  total,
});

/**
 * A fake `fetchJson`. It answers each URL with the first matching rule and records all URLs.
 * A URL without a rule is "offline".
 */
export function fakeFetch(rules: readonly { match: string; result: FetchResult }[]) {
  const urls: string[] = [];
  const fetchJson: FetchJson = (url) => {
    urls.push(url);
    const rule = rules.find((candidate) => url.includes(candidate.match));
    return Promise.resolve(rule?.result ?? { kind: "offline" });
  };
  return { fetchJson, urls };
}
