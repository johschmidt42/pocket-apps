import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { schema } from "./schema.ts";

describe("spielekaeufe schema", () => {
  it("has the app ID of the data file", () => {
    expect(schema.app).toBe("spielekaeufe");
  });

  it("is at version 1", () => {
    // When you add a migration, update this test and add a test for the migration.
    expect(currentVersion(schema)).toBe(1);
  });

  it("starts with an empty list that is valid", () => {
    expect(schema.validate.parse(schema.initial())).toEqual({ purchases: [] });
  });

  it("accepts a purchase without a picture and rejects a price in euro", () => {
    const purchase = { id: "a", date: "2026-11-20", name: "Hades", priceCents: 1999, appId: null };
    expect(schema.validate.safeParse({ purchases: [purchase] }).success).toBe(true);
    expect(
      schema.validate.safeParse({ purchases: [{ ...purchase, priceCents: 19.99 }] }).success,
    ).toBe(false);
  });
});
