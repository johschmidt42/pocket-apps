import { describe, expect, it } from "vitest";
import {
  dayNumber,
  formatDuration,
  formatPartial,
  formatWhen,
  fromDayNumber,
  interval,
  localIsoDate,
  parseDateInput,
  periodEnd,
  periodStart,
  precisionOf,
  toDateInput,
} from "./dates.ts";

describe("partial dates", () => {
  it("knows the precision from the form of the text", () => {
    expect(precisionOf("2026-11-14")).toBe("day");
    expect(precisionOf("2026-11")).toBe("month");
    expect(precisionOf("2026")).toBe("year");
  });

  it("counts days since 1970-01-01, also for old years", () => {
    expect(dayNumber(1970, 1, 1)).toBe(0);
    expect(dayNumber(1970, 1, 2)).toBe(1);
    expect(dayNumber(1969, 12, 31)).toBe(-1);
    expect(fromDayNumber(dayNumber(2024, 2, 29))).toEqual({ year: 2024, month: 2, day: 29 });
    // Date.UTC would read the year 50 as 1950.
    expect(fromDayNumber(dayNumber(50, 6, 1))).toEqual({ year: 50, month: 6, day: 1 });
  });

  it("gives the first day of a period and the first day after it", () => {
    expect(periodStart("2026-11-14")).toBe(dayNumber(2026, 11, 14));
    expect(periodStart("2026-11")).toBe(dayNumber(2026, 11, 1));
    expect(periodStart("2026")).toBe(dayNumber(2026, 1, 1));
    expect(periodEnd("2026-12-31")).toBe(dayNumber(2027, 1, 1));
    expect(periodEnd("2026-12")).toBe(dayNumber(2027, 1, 1));
    expect(periodEnd("2026")).toBe(dayNumber(2027, 1, 1));
  });

  it("gives the time of points, ranges and ongoing ranges", () => {
    const today = dayNumber(2026, 11, 14);
    expect(interval({ kind: "point", date: "2026-03" }, today)).toEqual({
      from: dayNumber(2026, 3, 1),
      to: dayNumber(2026, 3, 1),
    });
    expect(interval({ kind: "range", start: "2015", end: "2020" }, today)).toEqual({
      from: dayNumber(2015, 1, 1),
      to: dayNumber(2021, 1, 1),
    });
    // A wrong range from a hand-made file does not get a negative length.
    expect(interval({ kind: "range", start: "2020", end: "2015" }, today)).toEqual({
      from: dayNumber(2020, 1, 1),
      to: dayNumber(2020, 1, 1),
    });
    expect(interval({ kind: "ongoing", start: "2018-11" }, today)).toEqual({
      from: dayNumber(2018, 11, 1),
      to: today + 1,
    });
    // An ongoing range that starts in the future has no length.
    expect(interval({ kind: "ongoing", start: "2030" }, today)).toEqual({
      from: dayNumber(2030, 1, 1),
      to: dayNumber(2030, 1, 1),
    });
  });

  it("formats dates and times in German", () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(formatPartial("2026-01-05")).toBe("05.01.2026");
    expect(formatPartial("2026-01")).toBe("01/2026");
    expect(formatPartial("0800")).toBe("800");
    expect(formatWhen({ kind: "point", date: "2026-11-14" })).toBe("14.11.2026");
    expect(formatWhen({ kind: "range", start: "2013-10", end: "2018-09" })).toBe(
      "10/2013 – 09/2018",
    );
    expect(formatWhen({ kind: "ongoing", start: "2018-11" })).toBe("seit 11/2018");
    // Two days of the same year show the year once.
    expect(formatWhen({ kind: "range", start: "2026-02-01", end: "2026-03-03" })).toBe(
      "01.02. – 03.03.2026",
    );
    expect(formatWhen({ kind: "range", start: "2025-12-20", end: "2026-01-06" })).toBe(
      "20.12.2025 – 06.01.2026",
    );
    expect(formatWhen({ kind: "range", start: "2026-02", end: "2026-03-03" })).toBe(
      "02/2026 – 03.03.2026",
    );
  });

  it("formats lengths of time", () => {
    expect(formatDuration(1)).toBe("1 Tag");
    expect(formatDuration(12)).toBe("12 Tage");
    expect(formatDuration(31)).toBe("1 Monat");
    expect(formatDuration(150)).toBe("5 Monate");
    expect(formatDuration(366)).toBe("1 Jahr");
    expect(formatDuration(6 * 365)).toBe("6 Jahre");
  });

  it("reads the values of the date fields", () => {
    expect(parseDateInput("2026-11-14", "day")).toBe("2026-11-14");
    expect(parseDateInput(" 2026-11-14 ", "day")).toBe("2026-11-14");
    expect(parseDateInput("2026-02-30", "day")).toBeNull();
    expect(parseDateInput("0000-01-01", "day")).toBeNull();
    expect(parseDateInput("14.11.2026", "day")).toBeNull();
    expect(parseDateInput("2026-11", "month")).toBe("2026-11");
    expect(parseDateInput("2026-13", "month")).toBeNull();
    expect(parseDateInput("0000-05", "month")).toBeNull();
    expect(parseDateInput("2026", "year")).toBe("2026");
    expect(parseDateInput("800", "year")).toBe("0800");
    expect(parseDateInput("0", "year")).toBeNull();
    expect(parseDateInput("", "year")).toBeNull();
    expect(parseDateInput("20266", "year")).toBeNull();
  });

  it("fills the date fields, also with another precision", () => {
    expect(toDateInput("2026-11-14", "day")).toBe("2026-11-14");
    expect(toDateInput("2026-11-14", "month")).toBe("2026-11");
    expect(toDateInput("2026-11-14", "year")).toBe("2026");
    expect(toDateInput("2026", "month")).toBe("2026-01");
    expect(toDateInput("2026", "day")).toBe("2026-01-01");
    expect(toDateInput("0800", "year")).toBe("800");
  });
});
