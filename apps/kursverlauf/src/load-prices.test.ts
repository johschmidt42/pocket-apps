import { describe, expect, it } from "vitest";
import {
  loadPrices,
  needsFetch,
  refreshableSymbols,
  staleSymbols,
  storePrices,
} from "./load-prices.ts";
import type { KursverlaufData } from "./schema.ts";
import { fakeFetch, weeklyJson } from "./test-data.ts";

const now = new Date(2026, 10, 10, 12, 0);

describe("loadPrices", () => {
  it("gives the prices with the time of the download", async () => {
    const { fetchJson, urls } = fakeFetch([
      {
        match: "SPYI",
        result: { kind: "ok", json: weeklyJson([{ date: "2026-11-09", close: 11.5 }]) },
      },
    ]);

    expect(await loadPrices("SPYI.DEX", "KEY1", fetchJson, now)).toEqual({
      kind: "ok",
      prices: { fetchedAt: now.toISOString(), points: [{ date: "2026-11-09", close: 11.5 }] },
    });
    expect(urls[0]).toContain("apikey=KEY1");
  });

  it.each([
    [{ kind: "offline" } as const, "Keine Verbindung"],
    [{ kind: "bad-body" } as const, "unerwartete Antwort"],
    [{ kind: "http-error", status: 503 } as const, "Fehler 503"],
    [{ kind: "ok", json: { "Error Message": "apikey is invalid" } } as const, "API-Key"],
    [
      { kind: "ok", json: { "Error Message": "Invalid API call" } } as const,
      "keine Kurse für X.DEX",
    ],
    [{ kind: "ok", json: { Information: "1 request per second" } } as const, "zu schnelle"],
    [{ kind: "ok", json: { Information: "25 requests per day" } } as const, "25 Abrufe pro Tag"],
    [{ kind: "ok", json: [] } as const, "unerwartete Antwort"],
  ])("gives a German message for %j", async (result, text) => {
    const { fetchJson } = fakeFetch([{ match: "", result }]);

    const loaded = await loadPrices("X.DEX", "KEY1", fetchJson, now);

    expect(loaded.kind === "error" ? loaded.message : "").toContain(text);
  });
});

const data: KursverlaufData = {
  apiKey: "KEY1",
  etfs: [
    { id: "1", isin: "", symbol: "A.DEX", name: "A" },
    { id: "2", isin: "", symbol: "B.DEX", name: "B" },
    { id: "3", isin: "", symbol: "C.DEX", name: "C" },
  ],
  prices: {
    "A.DEX": { fetchedAt: new Date(2026, 10, 10, 8, 0).toISOString(), points: [] },
    "B.DEX": { fetchedAt: new Date(2026, 10, 9, 20, 0).toISOString(), points: [] },
  },
};

describe("stale prices", () => {
  it("fetches again on a new day and for new ETFs", () => {
    expect(needsFetch(data.prices["A.DEX"], now)).toBe(false);
    expect(staleSymbols(data, now)).toEqual(["B.DEX", "C.DEX"]);
  });

  it("refreshes on request only ETFs with an error, without prices or with a download older than 1 hour", () => {
    const at = new Date(2026, 10, 10, 8, 30);

    expect(refreshableSymbols(data, new Map(), at)).toEqual(["B.DEX", "C.DEX"]);
    expect(refreshableSymbols(data, new Map([["A.DEX", "Fehler"]]), at)).toEqual([
      "A.DEX",
      "B.DEX",
      "C.DEX",
    ]);
    expect(refreshableSymbols(data, new Map(), new Date(2026, 10, 10, 9, 1))).toEqual([
      "A.DEX",
      "B.DEX",
      "C.DEX",
    ]);
  });

  it("stores prices only for ETFs in the list", () => {
    const prices = { fetchedAt: now.toISOString(), points: [] };

    expect(storePrices(data, "C.DEX", prices).prices["C.DEX"]).toBe(prices);
    expect(storePrices(data, "X.DEX", prices)).toBe(data);
  });
});
