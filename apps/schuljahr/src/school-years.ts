// A school year goes from August 1 to July 31 (KMK). "2026/27" has the start year 2026.

/** The start year of the school year that contains the day. */
export function startYearOf(iso: string): number {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return month >= 8 ? year : year - 1;
}

/** "2026/27" */
export function schoolYearLabel(startYear: number): string {
  return `${String(startYear)}/${String(startYear + 1).slice(2)}`;
}

/** The first and the last day of the school year. */
export function schoolYearDays(startYear: number): { first: string; last: string } {
  return { first: `${String(startYear)}-08-01`, last: `${String(startYear + 1)}-07-31` };
}

/**
 * The days that the app loads for a school year: until September 30 after it.
 * Thus the next summer holidays are complete also where they start in August (Bayern).
 */
export function loadDays(startYear: number): { from: string; to: string } {
  return { from: `${String(startYear)}-08-01`, to: `${String(startYear + 1)}-09-30` };
}

/** The school years in the select box: from last year to 3 years ahead, and all stored ones. */
export function yearChoices(today: string, stored: readonly number[]): number[] {
  const current = startYearOf(today);
  const range = [current - 1, current, current + 1, current + 2, current + 3];
  return [...new Set([...range, ...stored])].sort((a, b) => a - b);
}
