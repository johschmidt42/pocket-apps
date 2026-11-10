import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  eachDay,
  formatDay,
  formatDays,
  formatLongDay,
  formatRange,
  isWeekend,
  localIsoDate,
  toLocalDate,
} from "./dates.ts";

describe("dates", () => {
  it("adds days over the end of a month, a year and the summer time", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-27", 2)).toBe("2027-03-29");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("counts the days between two days", () => {
    expect(daysBetween("2026-11-10", "2026-11-18")).toBe(8);
    expect(daysBetween("2026-11-10", "2026-11-10")).toBe(0);
    expect(daysBetween("2026-11-10", "2026-11-09")).toBe(-1);
  });

  it("knows the weekend", () => {
    expect(isWeekend("2026-11-14")).toBe(true);
    expect(isWeekend("2026-11-15")).toBe(true);
    expect(isWeekend("2026-11-16")).toBe(false);
  });

  it("lists each day, or none if the end is before the start", () => {
    expect(eachDay("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
    expect(eachDay("2026-11-10", "2026-11-09")).toEqual([]);
  });

  it("converts between ISO days and local dates", () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    const date = toLocalDate("2026-11-10");
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 10, 10, 0,
    ]);
  });

  it("formats days in German", () => {
    expect(formatDay("2026-11-02")).toBe("Mo., 2.11.2026");
    expect(formatLongDay("2026-11-02")).toBe("Montag, 2. November 2026");
    expect(formatRange("2026-11-18", "2026-11-18")).toBe("Mi., 18.11.2026");
    expect(formatRange("2026-11-02", "2026-11-06")).toBe("Mo., 2.11. – Fr., 6.11.2026");
    expect(formatRange("2026-12-24", "2027-01-08")).toBe("Do., 24.12.2026 – Fr., 8.1.2027");
    expect(formatDays(1)).toBe("1 Tag");
    expect(formatDays(5)).toBe("5 Tage");
  });
});
