import { describe, expect, it } from "vitest";
import { isIsin, parseSearch, searchUrl } from "./twelve-data.ts";

describe("searchUrl", () => {
  it("searches for the trimmed text", () => {
    expect(searchUrl(" IE00B3RBWM25 ")).toBe(
      "https://api.twelvedata.com/symbol_search?symbol=IE00B3RBWM25",
    );
  });
});

describe("parseSearch", () => {
  it("keeps each Xetra listing once and adds .DEX", () => {
    const json = {
      data: [
        { symbol: "VWRL", instrument_name: "Vanguard FTSE All-World", mic_code: "XLON" },
        { symbol: "VGWL", instrument_name: "Vanguard FTSE All-World", mic_code: "XETR" },
        { symbol: "VGWL", instrument_name: "Vanguard FTSE All-World", mic_code: "XETR" },
      ],
      status: "ok",
    };

    expect(parseSearch(json)).toEqual([{ symbol: "VGWL.DEX", name: "Vanguard FTSE All-World" }]);
  });

  it("returns null for a wrong answer", () => {
    expect(parseSearch({ code: 429 })).toBeNull();
  });
});

describe("isIsin", () => {
  it.each([
    ["IE00B3RBWM25", true],
    ["lu1829220216", true],
    ["VGWL", false],
    ["IE00B3RBWM2X", false],
  ])("%s → %s", (text, expected) => {
    expect(isIsin(text)).toBe(expected);
  });
});
