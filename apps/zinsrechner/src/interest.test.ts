import { describe, expect, it } from "vitest";
import { compoundInterest, parseInterestInput, parseNumber } from "./interest.ts";

describe("compoundInterest", () => {
  it("adds interest once per year", () => {
    const result = compoundInterest({ principal: 1000, ratePercent: 10, years: 2 });

    expect(result.finalAmount).toBeCloseTo(1210);
    expect(result.interest).toBeCloseTo(210);
  });

  it("returns the principal for 0 years", () => {
    expect(compoundInterest({ principal: 500, ratePercent: 5, years: 0 })).toEqual({
      finalAmount: 500,
      interest: 0,
    });
  });
});

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

describe("parseInterestInput", () => {
  it("parses all three fields", () => {
    expect(parseInterestInput({ principal: "10.000", ratePercent: "3,5", years: "10" })).toEqual({
      principal: 10000,
      ratePercent: 3.5,
      years: 10,
    });
  });

  it.each([
    { principal: "", ratePercent: "3", years: "10" },
    { principal: "1", ratePercent: "x", years: "10" },
    { principal: "1", ratePercent: "3", years: "" },
  ])("returns null if one field is invalid: %o", (fields) => {
    expect(parseInterestInput(fields)).toBeNull();
  });
});
