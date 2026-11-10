import { z } from "zod";

/** Twelve Data finds a ticker by ISIN or by name. The search needs no key. */
export function searchUrl(query: string): string {
  return `https://api.twelvedata.com/symbol_search?${new URLSearchParams({ symbol: query.trim() }).toString()}`;
}

const searchSchema = z.object({
  data: z.array(
    z.object({
      symbol: z.string(),
      instrument_name: z.string(),
      mic_code: z.string(),
    }),
  ),
});

export type SearchHit = {
  /** The Alpha Vantage symbol: the Xetra ticker with ".DEX". */
  symbol: string;
  name: string;
};

/** The Xetra listings in a search result. Alpha Vantage has prices only for these. `null` for a wrong answer. */
export function parseSearch(json: unknown): SearchHit[] | null {
  const parsed = searchSchema.safeParse(json);
  if (!parsed.success) return null;
  const hits = parsed.data.data
    .filter((entry) => entry.mic_code === "XETR")
    .map((entry) => ({ symbol: `${entry.symbol}.DEX`, name: entry.instrument_name }));
  // The same ticker can come more than once.
  return hits.filter(
    (hit, index) => hits.findIndex((other) => other.symbol === hit.symbol) === index,
  );
}

/** True for an ISIN: 2 letters, 9 letters or digits, 1 check digit. */
export function isIsin(text: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(text.trim().toUpperCase());
}
