import { describe, expect, it } from "vitest";
import { parseNumber } from "./numbers.ts";

describe("parseNumber", () => {
  it.each([
    ["1234.5", 1234.5],
    ["1.234,5", 1234.5],
    ["10.000", 10000],
    ["1.234.567", 1234567],
    ["3,5", 3.5],
    [" 10 000 ", 10000],
    ["-2", -2],
  ])("reads %j as %d", (text, expected) => {
    expect(parseNumber(text)).toBe(expected);
  });

  it.each(["", "   ", "abc", "1,2,3"])("returns null for %j", (text) => {
    expect(parseNumber(text)).toBeNull();
  });
});
