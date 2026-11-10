import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { schema } from "./schema.ts";

describe("launcher schema", () => {
  it("starts at version 1 with an empty order", () => {
    expect(currentVersion(schema)).toBe(1);
    expect(schema.initial()).toEqual({ order: [] });
    expect(schema.validate.parse({ order: ["app-ideen"] })).toEqual({ order: ["app-ideen"] });
  });
});
