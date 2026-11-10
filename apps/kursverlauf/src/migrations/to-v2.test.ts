import { describe, expect, it } from "vitest";
import { toV2 } from "./to-v2.ts";

/** Data of schema version 1, as kursverlauf 1.0 wrote it. */
const V1_DATA = {
  apiKey: "KEY12345",
  etfs: [{ id: "a", isin: "IE00B3RBWM25", symbol: "VGWL.DEX", name: "Vanguard" }],
  prices: {
    "VGWL.DEX": {
      fetchedAt: "2026-11-10T09:00:00.000Z",
      points: [{ date: "2026-11-09", close: 161.68 }],
    },
  },
};

describe("toV2", () => {
  it("keeps the key and the ETFs and removes the stored prices", () => {
    expect(toV2(V1_DATA)).toEqual({ apiKey: "KEY12345", etfs: V1_DATA.etfs, prices: {} });
  });

  it("stops for data that is not version 1", () => {
    expect(() => toV2({ apiKey: 1 })).toThrow();
  });
});
