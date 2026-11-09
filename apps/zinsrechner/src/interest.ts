export type InterestInput = {
  principal: number;
  /** Interest rate per year, in percent. */
  ratePercent: number;
  years: number;
};

export type InterestResult = {
  finalAmount: number;
  interest: number;
};

/** Compound interest, paid once per year. */
export function compoundInterest({ principal, ratePercent, years }: InterestInput): InterestResult {
  const finalAmount = principal * (1 + ratePercent / 100) ** years;
  return { finalAmount, interest: finalAmount - principal };
}

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

/** Parses the three form fields. Returns `null` if one field is not a number. */
export function parseInterestInput(fields: {
  principal: string;
  ratePercent: string;
  years: string;
}): InterestInput | null {
  const principal = parseNumber(fields.principal);
  const ratePercent = parseNumber(fields.ratePercent);
  const years = parseNumber(fields.years);
  if (principal === null || ratePercent === null || years === null) return null;
  return { principal, ratePercent, years };
}
