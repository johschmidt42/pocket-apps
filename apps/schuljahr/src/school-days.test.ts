import { describe, expect, it } from "vitest";
import {
  countSchoolDays,
  describeDay,
  calendarMonths,
  describeToday,
  holidayText,
  inSchoolYear,
  schoolBreaks,
  schoolDaysUntil,
  totals,
  type Today,
} from "./school-days.ts";
import { bayern2026 } from "./test-data.ts";

const year = bayern2026();

function during(today: string): Extract<Today, { kind: "during" }> {
  const result = describeToday(year, today);
  if (result.kind !== "during") throw new Error(`Not during the school year: ${today}`);
  return result;
}

describe("describeDay", () => {
  it("knows school days, weekends, holidays and public holidays", () => {
    expect(describeDay("2026-11-10", year.holidays)).toEqual({
      date: "2026-11-10",
      weekend: false,
      schoolDay: true,
      category: null,
      names: [],
      holidays: [],
      main: null,
    });
    expect(describeDay("2026-11-14", year.holidays)).toMatchObject({
      weekend: true,
      schoolDay: false,
    });
    expect(describeDay("2026-11-03", year.holidays)).toMatchObject({
      schoolDay: false,
      category: "herbst",
      names: ["Herbstferien"],
    });
    // A public holiday in the holidays: the public holiday gives the color.
    expect(describeDay("2026-12-25", year.holidays)).toMatchObject({
      category: "feiertag",
      names: ["Weihnachtsferien", "1. Weihnachtsfeiertag"],
    });
    // A public holiday on a weekday is no school day.
    expect(describeDay("2027-05-06", year.holidays)).toMatchObject({
      schoolDay: false,
      category: "feiertag",
    });
  });
});

describe("countSchoolDays", () => {
  it("counts only school days, both ends included", () => {
    expect(countSchoolDays("2026-11-09", "2026-11-13", year.holidays)).toBe(5);
    expect(countSchoolDays("2026-11-02", "2026-11-08", year.holidays)).toBe(0);
    expect(countSchoolDays("2026-11-10", "2026-11-09", year.holidays)).toBe(0);
  });
});

describe("schoolDaysUntil and inSchoolYear", () => {
  it("counts to the day before the holidays and knows the school year", () => {
    const [summer2026, , bussUndBettag] = schoolBreaks(year.holidays);
    expect(schoolDaysUntil(bussUndBettag!, "2026-11-10", year.holidays)).toBe(6);
    expect(inSchoolYear(summer2026!, 2026)).toBe(true);
    expect(inSchoolYear(summer2026!, 2025)).toBe(false);
    const summer2027 = schoolBreaks(year.holidays).at(-1)!;
    expect(inSchoolYear(summer2027, 2026)).toBe(false);
  });
});

describe("holidayText and calendarMonths", () => {
  it("names the holidays of a day", () => {
    expect(holidayText(describeDay("2026-12-25", year.holidays))).toBe(
      "Weihnachtsferien, Feiertag: 1. Weihnachtsfeiertag",
    );
    expect(holidayText(describeDay("2026-11-10", year.holidays))).toBe("");
  });

  it("shows the months from the first to the last school day", () => {
    // Bayern 2026/27: first school day September 15, last school day July 30.
    expect(calendarMonths(year)).toEqual({ firstMonth: "2026-09-01", count: 11 });
    const noSchool = {
      ...year,
      holidays: [
        { id: "x", kind: "school" as const, name: "Frei", start: "2026-08-01", end: "2027-07-31" },
      ],
    };
    expect(calendarMonths(noSchool)).toEqual({ firstMonth: "2026-08-01", count: 12 });
  });
});

describe("totals", () => {
  it("counts the whole school year", () => {
    expect(totals(year)).toEqual({ schoolDays: 185, holidayDays: 93, publicHolidays: 13 });
    expect(schoolBreaks(year.holidays).every((holiday) => holiday.kind === "school")).toBe(true);
  });
});

describe("describeToday", () => {
  it("counts the school days to the next holidays and to the summer", () => {
    const now = during("2026-11-10");
    expect(now.day.schoolDay).toBe(true);
    expect(now.currentBreak).toBeNull();
    // The Buß- und Bettag is a single free day, not "Ferien". The next Ferien are at Christmas.
    expect(now.nextBreak?.holiday.name).toBe("Weihnachtsferien");
    expect(now.nextBreak?.schoolDays).toBe(31);
    expect(now.summer?.holiday.start).toBe("2027-08-02");
    expect(now.summer?.schoolDays).toBe(150);
    expect([now.done, now.total]).toEqual([35, 185]);
  });

  it("gives the first school day in the holidays", () => {
    const now = during("2026-12-28");
    expect(now.currentBreak?.name).toBe("Weihnachtsferien");
    expect(now.nextSchoolDay).toBe("2027-01-11");
  });

  it("has no extra summer entry when the summer is next", () => {
    const now = during("2027-07-01");
    expect(now.nextBreak?.holiday.name).toBe("Sommerferien");
    expect(now.summer).toBeNull();
  });

  it("has no next holidays and no next school day after the last loaded holidays", () => {
    const now = during("2027-07-31");
    expect(now.nextBreak?.holiday.start).toBe("2027-08-02");
    const short = {
      ...year,
      holidays: year.holidays.filter((holiday) => holiday.end < "2027-07-01"),
    };
    const late = describeToday(short, "2027-07-31");
    expect(late).toMatchObject({ kind: "during", nextBreak: null, summer: null });
    const inSummer = describeToday(
      { ...year, holidays: year.holidays.filter((holiday) => holiday.start < "2027-08-01") },
      "2026-08-10",
    );
    expect(inSummer).toMatchObject({ kind: "during", nextSchoolDay: "2026-09-15" });
  });

  it("knows the days before and after the school year", () => {
    expect(describeToday(year, "2026-07-20")).toEqual({
      kind: "before",
      firstSchoolDay: "2026-09-15",
    });
    const allFree = {
      ...year,
      holidays: [
        { id: "x", kind: "school" as const, name: "Frei", start: "2026-08-01", end: "2027-07-31" },
      ],
    };
    expect(describeToday(allFree, "2026-07-20")).toEqual({ kind: "before", firstSchoolDay: null });
    expect(describeToday(year, "2027-08-01")).toEqual({ kind: "after" });
  });
});
