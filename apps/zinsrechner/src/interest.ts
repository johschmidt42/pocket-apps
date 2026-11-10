import { parseNumber } from "@pocket-apps/core/numbers";

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
