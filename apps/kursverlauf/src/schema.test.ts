import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { schema } from "./schema.ts";

describe("kursverlauf schema", () => {
  it("is at version 2 and starts without key, ETFs and prices", () => {
    expect(currentVersion(schema)).toBe(2);
    expect(schema.initial()).toEqual({ apiKey: "", etfs: [], prices: {} });
  });

  it("validates stored prices", () => {
    const data = {
      apiKey: "KEY1",
      etfs: [{ id: "1", isin: "IE00B3RBWM25", symbol: "VGWL.DEX", name: "Vanguard" }],
      prices: {
        "VGWL.DEX": {
          fetchedAt: "2026-11-10T09:00:00.000Z",
          points: [{ date: "2026-11-09", close: 161.68, total: 161.68 }],
        },
      },
    };

    expect(schema.validate.parse(data)).toEqual(data);
    expect(
      schema.validate.safeParse({ ...data, prices: { x: { fetchedAt: "gestern", points: [] } } })
        .success,
    ).toBe(false);
  });
});
