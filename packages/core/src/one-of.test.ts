import { describe, expect, it } from "vitest";
import { isOneOf } from "./one-of.ts";

describe("isOneOf", () => {
  it("is true only for a value of the list", () => {
    const sides = ["left", "right"] as const;
    expect(isOneOf(sides, "left")).toBe(true);
    expect(isOneOf(sides, "middle")).toBe(false);
  });
});
