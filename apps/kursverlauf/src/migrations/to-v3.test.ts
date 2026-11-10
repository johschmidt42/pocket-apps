import { describe, expect, it } from "vitest";
import { toV3 } from "./to-v3.ts";

/** Data of schema version 2, as kursverlauf 2.0 wrote it. */
const V2_DATA = {
  apiKey: "KEY12345",
  etfs: [{ id: "a", isin: "IE00B3RBWM25", symbol: "VGWL.DEX", name: "Vanguard" }],
  prices: {
    "VGWL.DEX": {
      fetchedAt: "2026-11-10T10:00:00.000Z",
      points: [{ date: "2026-11-09", close: 161.68, total: 161.68 }],
    },
  },
};

describe("toV3", () => {
  it("keeps the key and the ETFs and removes the stored prices", () => {
    expect(toV3(V2_DATA)).toEqual({ apiKey: "KEY12345", etfs: V2_DATA.etfs, prices: {} });
  });

  it("stops for data that is not version 2", () => {
    expect(() => toV3({ etfs: [] })).toThrow();
  });
});
