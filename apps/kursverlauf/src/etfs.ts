import type { Etf, KursverlaufData } from "./schema.ts";

/** Adds an ETF at the end of the list. */
export function addEtf(data: KursverlaufData, etf: Etf): KursverlaufData {
  return { ...data, etfs: [...data.etfs, etf] };
}

/** Removes an ETF and its stored prices. */
export function removeEtf(data: KursverlaufData, id: string): KursverlaufData {
  const removed = data.etfs.find((etf) => etf.id === id);
  return {
    ...data,
    etfs: data.etfs.filter((etf) => etf.id !== id),
    prices: Object.fromEntries(
      Object.entries(data.prices).filter(([symbol]) => symbol !== removed?.symbol),
    ),
  };
}

/**
 * For the status line: the newest price date of all ETFs and the oldest download.
 * The oldest download tells how fresh the data of all ETFs is. `null` without prices.
 */
export function priceStatus(
  data: KursverlaufData,
): { newestDate: string; oldestFetch: string } | null {
  const stored = data.etfs.flatMap((etf) => {
    const prices = data.prices[etf.symbol];
    const last = prices?.points.at(-1);
    return prices && last ? [{ date: last.date, fetchedAt: prices.fetchedAt }] : [];
  });
  if (stored.length === 0) return null;
  return {
    newestDate: stored.map((entry) => entry.date).reduce((a, b) => (b > a ? b : a)),
    oldestFetch: stored.map((entry) => entry.fetchedAt).reduce((a, b) => (b < a ? b : a)),
  };
}
