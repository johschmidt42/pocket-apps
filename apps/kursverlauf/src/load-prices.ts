import { parseWeekly, weeklyUrl } from "./alpha-vantage.ts";
import type { FetchJson } from "./fetch-json.ts";
import type { KursverlaufData, Prices } from "./schema.ts";

export type LoadResult = { kind: "ok"; prices: Prices } | { kind: "error"; message: string };

/** Gets the weekly prices of one ETF. Gives a German message for each kind of error. */
export async function loadPrices(
  symbol: string,
  apiKey: string,
  fetchJson: FetchJson,
  now: Date,
): Promise<LoadResult> {
  const response = await fetchJson(weeklyUrl(symbol, apiKey));
  switch (response.kind) {
    case "offline":
      return { kind: "error", message: "Keine Verbindung zu Alpha Vantage." };
    case "bad-body":
      return { kind: "error", message: "Alpha Vantage gibt eine unerwartete Antwort." };
    case "http-error":
      return {
        kind: "error",
        message: `Alpha Vantage antwortet mit Fehler ${String(response.status)}.`,
      };
    case "ok":
      break;
  }
  const result = parseWeekly(response.json);
  switch (result.kind) {
    case "ok":
      return { kind: "ok", prices: { fetchedAt: now.toISOString(), points: result.points } };
    case "bad-key":
      return { kind: "error", message: "Alpha Vantage kennt deinen API-Key nicht. Prüfe den Key." };
    case "unknown-symbol":
      return { kind: "error", message: `Alpha Vantage hat keine Kurse für ${symbol}.` };
    case "too-fast":
      return {
        kind: "error",
        message: "Alpha Vantage lehnt zu schnelle Abrufe ab. Versuche es gleich noch einmal.",
      };
    case "limit":
      return {
        kind: "error",
        message:
          "Das Limit von Alpha Vantage ist erreicht (25 Abrufe pro Tag). Versuche es morgen wieder.",
      };
    case "invalid":
      return { kind: "error", message: "Alpha Vantage gibt eine unerwartete Antwort." };
  }
}

/** True if the prices were fetched on an earlier day, or never. Then the app fetches them again. */
export function needsFetch(prices: Prices | undefined, now: Date): boolean {
  return prices === undefined || new Date(prices.fetchedAt).toDateString() !== now.toDateString();
}

/** A manual refresh loads an ETF again only after this time. Weekly prices change at most once a day. */
export const REFRESH_AFTER_MS = 60 * 60 * 1000;

/** The symbols that "Kurse aktualisieren" loads: ETFs with an error, without prices, or with a download older than 1 hour. */
export function refreshableSymbols(
  data: KursverlaufData,
  errors: ReadonlyMap<string, string>,
  now: Date,
): string[] {
  return data.etfs
    .map((etf) => etf.symbol)
    .filter((symbol) => {
      const prices = data.prices[symbol];
      return (
        errors.has(symbol) ||
        prices === undefined ||
        now.getTime() - new Date(prices.fetchedAt).getTime() > REFRESH_AFTER_MS
      );
    });
}

/** The symbols of the ETFs that need new prices, in the order of the list. */
export function staleSymbols(data: KursverlaufData, now: Date): string[] {
  return data.etfs
    .map((etf) => etf.symbol)
    .filter((symbol) => needsFetch(data.prices[symbol], now));
}

/** Stores new prices. Ignores them if the user removed the ETF in the meantime. */
export function storePrices(
  data: KursverlaufData,
  symbol: string,
  prices: Prices,
): KursverlaufData {
  if (!data.etfs.some((etf) => etf.symbol === symbol)) return data;
  return { ...data, prices: { ...data.prices, [symbol]: prices } };
}
