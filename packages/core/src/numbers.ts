// Numbers from German form inputs.

/** German thousands with dots: "10.000" or "1.234.567", optional decimal comma. */
const GERMAN_THOUSANDS = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;

/**
 * Parses a number from a German input. Returns `null` if the input is not a number.
 * Examples: "1.234,5" → 1234.5, "10.000" → 10000, "3,5" → 3.5, "1234.5" → 1234.5.
 */
export function parseNumber(text: string): number | null {
  const compact = text.trim().replace(/\s/g, "");
  if (compact === "") return null;
  const normalized =
    GERMAN_THOUSANDS.test(compact) || compact.includes(",")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
