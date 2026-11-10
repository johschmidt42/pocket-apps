import { describe, expect, it } from "vitest";
import { addEtf, priceStatus, removeEtf } from "./etfs.ts";
import type { KursverlaufData } from "./schema.ts";

const data: KursverlaufData = {
  apiKey: "KEY12345",
  etfs: [
    { id: "a", isin: "", symbol: "A.DEX", name: "A" },
    { id: "b", isin: "", symbol: "B.DEX", name: "B" },
  ],
  prices: {
    "A.DEX": {
      fetchedAt: "2026-11-10T08:00:00.000Z",
      points: [{ date: "2026-11-09", close: 1, total: 1 }],
    },
    "B.DEX": {
      fetchedAt: "2026-11-09T08:00:00.000Z",
      points: [{ date: "2026-11-06", close: 2, total: 2 }],
    },
  },
};

describe("etfs", () => {
  it("adds an ETF at the end", () => {
    const etf = { id: "c", isin: "", symbol: "C.DEX", name: "C" };

    expect(addEtf(data, etf).etfs.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("removes an ETF with its prices", () => {
    const next = removeEtf(data, "a");

    expect(next.etfs.map((entry) => entry.id)).toEqual(["b"]);
    expect(Object.keys(next.prices)).toEqual(["B.DEX"]);
  });

  it("finds the newest price date and the oldest download", () => {
    expect(priceStatus(data)).toEqual({
      newestDate: "2026-11-09",
      oldestFetch: "2026-11-09T08:00:00.000Z",
    });
    expect(priceStatus({ ...data, prices: {} })).toBeNull();
  });
});
