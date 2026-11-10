import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { FetchJson } from "@pocket-apps/core/fetch-json";
import { loadPrices, staleSymbols, storePrices } from "./load-prices.ts";
import type { KursverlaufData } from "./schema.ts";

export type RefreshOptions = {
  data: KursverlaufData;
  update: (change: (data: KursverlaufData) => KursverlaufData) => void;
  fetchJson: FetchJson;
  /** The wait between two requests. Alpha Vantage allows 1 request per second. */
  gapMs: number;
};

export type Refresh = {
  /** The symbols that load now. */
  loading: ReadonlySet<string>;
  /** An error message per symbol, from the last try. */
  errors: ReadonlyMap<string, string>;
  /** Loads the prices of these symbols again, also if they are new. */
  refresh: (symbols: readonly string[]) => void;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Loads the prices of the ETFs. At the start and for each new ETF, it loads the prices that are older than today.
 * It sends one request at a time, with a gap. It tries each symbol at most once automatically.
 */
export function usePriceRefresh({ data, update, fetchJson, gapMs }: RefreshOptions): Refresh {
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  // The queue lives outside of React state: it must not start a request twice.
  const queue = useRef<string[]>([]);
  const running = useRef(false);
  const tried = useRef(new Set<string>());
  // The time of the last request. The gap applies across runs too.
  const lastRequest = useRef(0);

  // A run sends the requests of the queue one after the other, with the key of the moment when it started.
  async function run(apiKey: string) {
    if (running.current) return;
    running.current = true;
    for (let symbol = queue.current.shift(); symbol !== undefined; symbol = queue.current.shift()) {
      const waitMs = lastRequest.current + gapMs - Date.now();
      if (waitMs > 0) await wait(waitMs);
      lastRequest.current = Date.now();
      const current = symbol;
      const result = await loadPrices(current, apiKey, fetchJson, new Date());
      setLoading((set) => without(set, current));
      if (result.kind === "ok") {
        update((stored) => storePrices(stored, current, result.prices));
        setErrors((map) => withoutKey(map, current));
      } else {
        setErrors((map) => new Map(map).set(current, result.message));
      }
    }
    running.current = false;
  }

  function enqueue(symbols: readonly string[]) {
    const fresh = symbols.filter((symbol) => !queue.current.includes(symbol));
    if (fresh.length === 0) return;
    queue.current.push(...fresh);
    setLoading((set) => new Set([...set, ...fresh]));
    void run(data.apiKey);
  }

  // Sync with Alpha Vantage: load the prices that are older than today, once per symbol and key.
  // A new key tries all symbols again. The effect depends on one string, so it runs only on a change.
  const stale =
    data.apiKey === "" ? "" : `${data.apiKey} ${staleSymbols(data, new Date()).join(" ")}`;
  const onStale = useEffectEvent((apiKey: string, symbols: string[]) => {
    const untried = symbols.filter((symbol) => !tried.current.has(`${apiKey}:${symbol}`));
    for (const symbol of untried) tried.current.add(`${apiKey}:${symbol}`);
    enqueue(untried);
  });
  useEffect(() => {
    const [apiKey = "", ...symbols] = stale.split(" ").filter((part) => part !== "");
    onStale(apiKey, symbols);
  }, [stale]);

  return {
    loading,
    errors,
    refresh: (symbols) => {
      enqueue(symbols);
    },
  };
}

function without(set: ReadonlySet<string>, item: string): ReadonlySet<string> {
  const next = new Set(set);
  next.delete(item);
  return next;
}

function withoutKey(map: ReadonlyMap<string, string>, key: string): ReadonlyMap<string, string> {
  const next = new Map(map);
  next.delete(key);
  return next;
}
