const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const percent = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const day = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat("de-DE", { month: "short", year: "2-digit" });
const time = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

export function formatEuro(value: number): string {
  return euro.format(value);
}

const euroRounded = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** For chart axes: whole values without cents ("75 €"), others with cents ("7,50 €"). */
export function formatAxisEuro(value: number): string {
  return Number.isInteger(value) ? euroRounded.format(value) : euro.format(value);
}

const plainPercent = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 0.013 → "1,3 %", without a sign. */
export function formatPercent(fraction: number): string {
  return plainPercent.format(fraction);
}

/** 0.123 → "+12,3 %". */
export function formatChange(fraction: number): string {
  return percent.format(fraction);
}

/** Reads an ISO date ("2026-11-09") as a local day. */
function localDay(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

/** "2026-11-09" → "09.11.2026". */
export function formatDay(isoDate: string): string {
  return day.format(localDay(isoDate));
}

/** "2026-11-09" → "Nov. 26", for chart axes. */
export function formatMonth(isoDate: string): string {
  return shortMonth.format(localDay(isoDate));
}

/** An ISO time → "heute, 09:41" or "09.11.2026, 09:41". */
export function formatFetchedAt(isoTime: string, now: Date): string {
  const at = new Date(isoTime);
  const sameDay = at.toDateString() === now.toDateString();
  return `${sameDay ? "heute" : day.format(at)}, ${time.format(at)}`;
}
