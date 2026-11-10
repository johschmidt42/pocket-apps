// Days are ISO strings ("2026-11-09"). ISO strings sort like dates, so `<` and `>` compare them.
// The date math runs in UTC. Thus a change to or from summer time does not move a day.

const DAY_MS = 86_400_000;

function utcTime(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/** The day `days` days after `iso` (or before, for a negative number). */
export function addDays(iso: string, days: number): string {
  return new Date(utcTime(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The number of days from `from` to `to`. 0 for the same day, negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcTime(to) - utcTime(from)) / DAY_MS);
}

/** True for Saturday and Sunday. */
export function isWeekend(iso: string): boolean {
  const day = new Date(utcTime(iso)).getUTCDay();
  return day === 0 || day === 6;
}

/** All days from `from` to `to`, both included. */
export function eachDay(from: string, to: string): string[] {
  const count = daysBetween(from, to) + 1;
  return Array.from({ length: Math.max(0, count) }, (_, index) => addDays(from, index));
}

/** The day of a `Date` in the time zone of the computer. */
export function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** Midnight of the day in the time zone of the computer. The calendar works with these dates. */
export function toLocalDate(iso: string): Date {
  const utc = new Date(utcTime(iso));
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

const shortFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const longFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "Mo., 2.11.2026" */
export function formatDay(iso: string): string {
  return shortFormat.format(utcTime(iso));
}

/** "Montag, 2. November 2026" */
export function formatLongDay(iso: string): string {
  return longFormat.format(utcTime(iso));
}

const noYearFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
  timeZone: "UTC",
});

/**
 * "Mo., 2.11. – Fr., 6.11.2026", or one day if `start` and `end` are the same.
 * (`Intl.DateTimeFormat.formatRange` gives "Mo., 02. – Fr., 06.11.2026" in German.)
 */
export function formatRange(start: string, end: string): string {
  if (start === end) return formatDay(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const from = sameYear ? noYearFormat.format(utcTime(start)) : formatDay(start);
  return `${from} – ${formatDay(end)}`;
}

/** "1 Schultag", "23 Schultage": the number with the singular or the plural. */
export function formatCount(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

/** "1 Tag", "5 Tage" */
export function formatDays(count: number): string {
  return formatCount(count, "Tag", "Tage");
}
