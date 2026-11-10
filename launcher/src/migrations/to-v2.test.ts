import { describe, expect, it } from "vitest";
import { toV2 } from "./to-v2.ts";

/** Data of schema version 1, as launcher 2.0 wrote it. */
const V1_DATA = { order: ["app-ideen", "zinsrechner"] };

describe("toV2", () => {
  it("keeps the order and adds an empty list of favorites", () => {
    expect(toV2(V1_DATA)).toEqual({ order: ["app-ideen", "zinsrechner"], favorites: [] });
  });

  it("stops for data that is not version 1", () => {
    expect(() => toV2({ order: "app-ideen" })).toThrow();
  });
});
