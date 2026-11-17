import { describe, expect, it } from "vitest";
import { decimalInput, formatDecimal } from "./decimal.ts";

describe("decimal numbers", () => {
  it("formats for text with a thousands dot", () => {
    expect(formatDecimal(1250.5)).toBe("1.250,5");
    expect(formatDecimal(42.555)).toBe("42,56");
  });

  it("formats for inputs without a thousands dot", () => {
    expect(decimalInput(1250.5)).toBe("1250,5");
    expect(decimalInput(60)).toBe("60");
  });
});
