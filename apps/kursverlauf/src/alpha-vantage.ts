import { z } from "zod";
import type { PricePoint } from "./schema.ts";

/** Alpha Vantage allows 1 request per second with a free key. Keep a safe gap. */
export const REQUEST_GAP_MS = 1500;

/** The URL of the weekly prices. One request gives the full history. */
export function weeklyUrl(symbol: string, apiKey: string): string {
  const params = new URLSearchParams({
    function: "TIME_SERIES_WEEKLY_ADJUSTED",
    symbol,
    apikey: apiKey,
  });
  return `https://www.alphavantage.co/query?${params.toString()}`;
}

const weekSchema = z.object({
  "4. close": z.coerce.number().positive(),
  "5. adjusted close": z.coerce.number().positive(),
});

const weeklySchema = z.object({
  "Weekly Adjusted Time Series": z.record(z.iso.date(), weekSchema),
});

/** Alpha Vantage answers with HTTP 200 also for errors. Then the JSON has one of these fields. */
const noticeSchema = z.union([
  z.object({ "Error Message": z.string() }),
  z.object({ Information: z.string() }),
  z.object({ Note: z.string() }),
]);

export type WeeklyResult =
  | { kind: "ok"; points: PricePoint[] }
  /** The key is wrong or missing. */
  | { kind: "bad-key" }
  /** Alpha Vantage does not know the symbol. */
  | { kind: "unknown-symbol" }
  /** More than 1 request per second. */
  | { kind: "too-fast" }
  /** More than 25 requests today. */
  | { kind: "limit" }
  | { kind: "invalid" };

/**
 * A split changes the close by a large factor, but not the adjusted close.
 * Dividends change the ratio of the two by a few percent only.
 */
const SPLIT_THRESHOLD = 1.5;

/**
 * Reads the weekly prices. `close` is the real close (without dividends), adjusted for splits:
 * the closes before a split are divided by the split ratio. Thus a 25:1 split is not a drop of 96 %.
 * `total` is the adjusted close of Alpha Vantage: adjusted for splits and dividends.
 */
export function parseWeekly(json: unknown): WeeklyResult {
  const parsed = weeklySchema.safeParse(json);
  if (!parsed.success) return parseNotice(json);
  const weeks = Object.entries(parsed.data["Weekly Adjusted Time Series"]).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  if (weeks.length === 0) return { kind: "invalid" };

  // Walk from the newest week to the oldest. Collect the split factors on the way.
  const points: PricePoint[] = [];
  let factor = 1;
  let newerRatio: number | null = null;
  for (const [date, week] of weeks.reverse()) {
    const ratio = week["5. adjusted close"] / week["4. close"];
    if (newerRatio !== null) {
      const jump = ratio / newerRatio;
      if (jump > SPLIT_THRESHOLD || jump < 1 / SPLIT_THRESHOLD) factor *= jump;
    }
    newerRatio = ratio;
    points.push({ date, close: week["4. close"] * factor, total: week["5. adjusted close"] });
  }
  return { kind: "ok", points: points.reverse() };
}

function parseNotice(json: unknown): WeeklyResult {
  const notice = noticeSchema.safeParse(json);
  if (!notice.success) return { kind: "invalid" };
  if ("Error Message" in notice.data) {
    return notice.data["Error Message"].toLowerCase().includes("apikey")
      ? { kind: "bad-key" }
      : { kind: "unknown-symbol" };
  }
  const text = "Information" in notice.data ? notice.data.Information : notice.data.Note;
  return text.includes("per second") ? { kind: "too-fast" } : { kind: "limit" };
}
