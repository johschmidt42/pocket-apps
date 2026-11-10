import { parseNumber } from "@pocket-apps/core/numbers";
import type { Interval } from "./schema.ts";

/** The number of months between two payments. */
export const MONTHS_PER_PAYMENT: Record<Interval, number> = {
  monthly: 1,
  quarterly: 3,
  "half-yearly": 6,
  yearly: 12,
};

export const INTERVAL_LABELS: Record<Interval, string> = {
  monthly: "monatlich",
  quarterly: "vierteljährlich",
  "half-yearly": "halbjährlich",
  yearly: "jährlich",
};

export const MONTH_LABELS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

/** Show amounts per month or per year. */
export const PERIODS = ["month", "year"] as const;
export type Period = (typeof PERIODS)[number];

/** The largest amount of one entry, in cents: 10 million euros. */
export const MAX_CENTS = 1_000_000_000;

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const euroRounded = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** Formats cents as euros: 123456 → "1.234,56 €". With `rounded`, without cents: "1.235 €". */
export function formatEuro(cents: number, rounded = false): string {
  return (rounded ? euroRounded : euro).format(cents / 100);
}

/** For chart labels: whole euros from 100 € on, else with cents. */
export function formatEuroShort(cents: number): string {
  return formatEuro(cents, Math.abs(cents) >= 10000);
}

/**
 * Reads a euro amount from a German input ("1.234,56"). Returns cents.
 * Returns `null` for a wrong input, a negative amount or an amount above `MAX_CENTS`.
 */
export function parseEuro(text: string): number | null {
  const value = parseNumber(text.replace("€", ""));
  if (value === null || value < 0) return null;
  const cents = Math.round(value * 100);
  return cents <= MAX_CENTS ? cents : null;
}

/** Formats cents for an input field: 123456 → "1234,56", 5000 → "50". */
export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

/** The amount of an entry per month or per year, in cents. Can have fractions of a cent. */
export function amountPer(
  entry: { amountCents: number; interval: Interval },
  period: Period,
): number {
  const monthly = entry.amountCents / MONTHS_PER_PAYMENT[entry.interval];
  return period === "month" ? monthly : monthly * 12;
}

/** True if the entry has a payment in the month (1 = January). */
export function paysInMonth(
  entry: { interval: Interval; dueMonth: number },
  month: number,
): boolean {
  return (month - entry.dueMonth + 12) % MONTHS_PER_PAYMENT[entry.interval] === 0;
}
