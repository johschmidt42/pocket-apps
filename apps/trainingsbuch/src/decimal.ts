/** A decimal number for text: "102,5" or "1.250". At most 2 decimals. */
export function formatDecimal(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

/**
 * A decimal number for an input field: "102,5" or "1250". No thousands dot, because
 * `parseNumber()` reads "1.250" as 1250 but "1.25" as 1,25.
 */
export function decimalInput(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 2, useGrouping: false });
}
