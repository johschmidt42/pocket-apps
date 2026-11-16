// Partial dates: a day ("2026-11-14"), a month ("2026-11") or a year ("2026").
// The layout works with day numbers: whole days since 1970-01-01 (UTC, no daylight saving).

import type { When } from "./schema.ts";

export const PRECISIONS = ["day", "month", "year"] as const;
export type Precision = (typeof PRECISIONS)[number];

export const PRECISION_LABELS: Record<Precision, string> = {
  day: "Tag",
  month: "Monat",
  year: "Jahr",
};

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const YEAR_PATTERN = /^\d{4}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 86_400_000;

/** The precision of a partial date. The schema makes sure that the text has one of the 3 forms. */
export function precisionOf(value: string): Precision {
  if (value.length === 10) return "day";
  if (value.length === 7) return "month";
  return "year";
}

/** The day number of a calendar day. Works for all years from 1 to 9999. */
export function dayNumber(year: number, month: number, day: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return Math.round(date.getTime() / MS_PER_DAY);
}

/** A day of the calendar. `month` and `day` start at 1. */
export type CalendarDay = { year: number; month: number; day: number };

/** A time span in day numbers. `to` is the first day after the span. */
export type Interval = { from: number; to: number };

/** The calendar day of a day number. */
export function fromDayNumber(days: number): CalendarDay {
  const date = new Date(days * MS_PER_DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function parts(value: string): CalendarDay {
  const [year = 1, month = 1, day = 1] = value.split("-").map(Number);
  return { year, month, day };
}

/** The first day of the period: the day itself, the 1st of the month, or January 1. */
export function periodStart(value: string): number {
  const { year, month, day } = parts(value);
  return dayNumber(year, month, day);
}

/** The first day after the period. */
export function periodEnd(value: string): number {
  const { year, month, day } = parts(value);
  switch (precisionOf(value)) {
    case "day":
      return dayNumber(year, month, day + 1);
    case "month":
      return dayNumber(year, month + 1, 1);
    case "year":
      return dayNumber(year + 1, 1, 1);
  }
}

/**
 * The time of an entry as day numbers. A point has `from === to`. A range ends after its last
 * period: "2015 – 2020" ends on 2021-01-01. An ongoing range ends after `today`.
 */
export function interval(when: When, today: number): Interval {
  switch (when.kind) {
    case "point": {
      const day = periodStart(when.date);
      return { from: day, to: day };
    }
    case "range": {
      const from = periodStart(when.start);
      return { from, to: Math.max(from, periodEnd(when.end)) };
    }
    case "ongoing": {
      const from = periodStart(when.start);
      return { from, to: Math.max(from, today + 1) };
    }
  }
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/** The local date of the computer as "2026-11-14". */
export function localIsoDate(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

/** German text: "14.11.2026", "11/2026" or "2026". */
export function formatPartial(value: string): string {
  const { year, month, day } = parts(value);
  switch (precisionOf(value)) {
    case "day":
      return `${pad(day, 2)}.${pad(month, 2)}.${String(year)}`;
    case "month":
      return `${pad(month, 2)}/${String(year)}`;
    case "year":
      return String(year);
  }
}

/**
 * The start of a range. Two days of the same year show the year only once, as is usual in German:
 * "01.02. – 03.03.2026". Thus the date fits into a narrow card.
 */
function formatRangeStart(start: string, end: string): string {
  const { year, month, day } = parts(start);
  if (precisionOf(start) === "day" && precisionOf(end) === "day" && year === parts(end).year) {
    return `${pad(day, 2)}.${pad(month, 2)}.`;
  }
  return formatPartial(start);
}

/** German text of the time of an entry: "14.11.2026", "2015 – 2020" or "seit 11/2018". */
export function formatWhen(when: When): string {
  switch (when.kind) {
    case "point":
      return formatPartial(when.date);
    case "range":
      return `${formatRangeStart(when.start, when.end)} – ${formatPartial(when.end)}`;
    case "ongoing":
      return `seit ${formatPartial(when.start)}`;
  }
}

/** A length of time in German, rounded: "6 Jahre", "1 Monat", "12 Tage". */
export function formatDuration(days: number): string {
  if (days >= 365) {
    const years = Math.round(days / 365.25);
    return years === 1 ? "1 Jahr" : `${String(years)} Jahre`;
  }
  if (days >= 30) {
    const months = Math.round(days / 30.44);
    return months === 1 ? "1 Monat" : `${String(months)} Monate`;
  }
  return days === 1 ? "1 Tag" : `${String(days)} Tage`;
}

/** The length of a range as text ("5 Jahre"), or `null` for a point and a range without length. */
export function durationText(when: When, today: number): string | null {
  if (when.kind === "point") return null;
  const { from, to } = interval(when, today);
  return to > from ? formatDuration(to - from) : null;
}

/**
 * Reads the value of a date field. The field type depends on the precision: a date field
 * ("2026-11-14"), a month field ("2026-11") or a number field ("2026", also "800").
 * Gives `null` for an empty or wrong value.
 */
export function parseDateInput(text: string, precision: Precision): string | null {
  const value = text.trim();
  switch (precision) {
    case "day": {
      if (!DAY_PATTERN.test(value)) return null;
      const { year, month, day } = parts(value);
      const check = fromDayNumber(dayNumber(year, month, day));
      return check.month === month && check.day === day && year > 0 ? value : null;
    }
    case "month":
      return MONTH_PATTERN.test(value) && !value.startsWith("0000") ? value : null;
    case "year": {
      if (!/^\d{1,4}$/.test(value) || Number(value) < 1) return null;
      return pad(Number(value), 4);
    }
  }
}

/** The value of a date field for a partial date. A year field shows "800", not "0800". */
export function toDateInput(value: string, precision: Precision): string {
  const { year, month, day } = parts(value);
  switch (precision) {
    case "day":
      return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
    case "month":
      return `${pad(year, 4)}-${pad(month, 2)}`;
    case "year":
      return String(year);
  }
}
