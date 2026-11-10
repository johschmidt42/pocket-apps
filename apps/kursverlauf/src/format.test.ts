import { describe, expect, it } from "vitest";
import {
  formatAxisEuro,
  formatChange,
  formatDay,
  formatEuro,
  formatFetchedAt,
  formatMonth,
} from "./format.ts";

const plain = (text: string) => text.replace(/\s/g, " ");

describe("format", () => {
  it("formats euros, changes and days in German", () => {
    expect(plain(formatEuro(11.522))).toBe("11,52 €");
    expect(plain(formatAxisEuro(75))).toBe("75 €");
    expect(plain(formatAxisEuro(7.5))).toBe("7,50 €");
    expect(plain(formatChange(0.123))).toBe("+12,3 %");
    expect(plain(formatChange(-0.05))).toBe("-5,0 %");
    expect(formatDay("2026-11-09")).toBe("09.11.2026");
    expect(formatMonth("2026-11-09")).toBe("Nov. 26");
  });

  it("says today for a time of today", () => {
    const now = new Date(2026, 10, 10, 18, 0);

    expect(formatFetchedAt(new Date(2026, 10, 10, 9, 41).toISOString(), now)).toBe("heute, 09:41");
    expect(formatFetchedAt(new Date(2026, 10, 9, 9, 41).toISOString(), now)).toBe(
      "09.11.2026, 09:41",
    );
  });
});
