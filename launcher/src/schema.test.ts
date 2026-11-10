import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { schema } from "./schema.ts";

describe("launcher schema", () => {
  it("is at version 2 and starts with no order and no favorites", () => {
    expect(currentVersion(schema)).toBe(2);
    expect(schema.initial()).toEqual({ order: [], favorites: [] });
    expect(schema.validate.parse({ order: ["app-ideen"], favorites: ["app-ideen"] })).toEqual({
      order: ["app-ideen"],
      favorites: ["app-ideen"],
    });
  });
});
