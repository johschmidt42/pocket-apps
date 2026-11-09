import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { schema } from "./schema.ts";

describe("app-ideen schema", () => {
  it("has the app ID of the data file", () => {
    expect(schema.app).toBe("app-ideen");
  });

  it("is at version 1", () => {
    // When you add a migration, update this test and add a test for the migration.
    expect(currentVersion(schema)).toBe(1);
  });

  it("starts with an empty list that is valid", () => {
    expect(schema.validate.parse(schema.initial())).toEqual({ ideas: [] });
  });

  it("rejects an idea without a title", () => {
    expect(
      schema.validate.safeParse({ ideas: [{ id: "a", title: "", description: "" }] }).success,
    ).toBe(false);
  });
});
