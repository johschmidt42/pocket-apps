import { categoryOf, type Category } from "./categories.ts";
import { addDays, eachDay, isWeekend } from "./dates.ts";
import type { Holiday, SchoolYear } from "./schema.ts";
import { schoolYearDays } from "./school-years.ts";

export type DayInfo = {
  date: string;
  weekend: boolean;
  /** Monday to Friday, no school holidays and no public holiday. */
  schoolDay: boolean;
  /** The color of the day. A public holiday wins over school holidays. `null` for a normal day. */
  category: Category | null;
  /** The names of all holidays on this day. */
  names: string[];
  /** All holidays on this day, oldest first. */
  holidays: Holiday[];
  /** The holiday that gives the color: the public holiday, else the first school holiday. */
  main: Holiday | null;
};

const covers = (holiday: Holiday, date: string) => holiday.start <= date && date <= holiday.end;

export function describeDay(date: string, holidays: readonly Holiday[]): DayInfo {
  const matches = holidays.filter((holiday) => covers(holiday, date));
  const publicHoliday = matches.find((holiday) => holiday.kind === "public");
  const main = publicHoliday ?? matches[0] ?? null;
  const weekend = isWeekend(date);
  return {
    date,
    weekend,
    schoolDay: !weekend && matches.length === 0,
    category: main ? categoryOf(main) : null,
    names: [...new Set(matches.map((holiday) => holiday.name))],
    holidays: matches,
    main,
  };
}

/** "Weihnachtsferien, Feiertag: 1. Weihnachtsfeiertag". Empty for a day without holidays. */
export function holidayText(day: DayInfo): string {
  const texts = day.holidays.map((holiday) =>
    holiday.kind === "public" ? `Feiertag: ${holiday.name}` : holiday.name,
  );
  return [...new Set(texts)].join(", ");
}

/**
 * The months that the calendar shows: from the month of the first school day to the month of the
 * last school day. In Bayern, school starts in September. Thus the calendar starts there.
 * Without school days, it shows the whole school year (August to July).
 */
export function calendarMonths(year: SchoolYear): { firstMonth: string; count: number } {
  const { first, last } = schoolYearDays(year.startYear);
  const schoolDays = eachDay(first, last).filter(
    (date) => describeDay(date, year.holidays).schoolDay,
  );
  const from = schoolDays[0] ?? first;
  const to = schoolDays.at(-1) ?? last;
  const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
  return { firstMonth: `${from.slice(0, 7)}-01`, count: monthIndex(to) - monthIndex(from) + 1 };
}

/** The school days from `from` to `to`, both included. 0 if `to` is before `from`. */
export function countSchoolDays(from: string, to: string, holidays: readonly Holiday[]): number {
  return eachDay(from, to).filter((date) => describeDay(date, holidays).schoolDay).length;
}

/** The school days from `today` (today included) to the day before the holiday. */
export function schoolDaysUntil(
  holiday: Holiday,
  today: string,
  holidays: readonly Holiday[],
): number {
  return countSchoolDays(today, addDays(holiday.start, -1), holidays);
}

/** The school holidays and single free days (no public holidays), oldest first. */
export function schoolBreaks(holidays: readonly Holiday[]): Holiday[] {
  return holidays.filter((holiday) => holiday.kind === "school");
}

/** True if the holiday has at least one day in the school year (August 1 to July 31). */
export function inSchoolYear(holiday: Holiday, startYear: number): boolean {
  const { first, last } = schoolYearDays(startYear);
  return holiday.start <= last && holiday.end >= first;
}

export type Totals = {
  schoolDays: number;
  /** All days in the school holidays, also weekends. */
  holidayDays: number;
  publicHolidays: number;
};

/** The numbers of the whole school year (August 1 to July 31). */
export function totals(year: SchoolYear): Totals {
  const { first, last } = schoolYearDays(year.startYear);
  const days = eachDay(first, last).map((date) => describeDay(date, year.holidays));
  const breaks = schoolBreaks(year.holidays);
  return {
    schoolDays: days.filter((day) => day.schoolDay).length,
    holidayDays: days.filter((day) => breaks.some((holiday) => covers(holiday, day.date))).length,
    publicHolidays: year.holidays.filter(
      (holiday) => holiday.kind === "public" && inSchoolYear(holiday, year.startYear),
    ).length,
  };
}

/** Where today is in the school year. */
export type Today =
  /** `firstSchoolDay` is `null` if the school year has no school day in the loaded data. */
  | { kind: "before"; firstSchoolDay: string | null }
  | { kind: "after" }
  | {
      kind: "during";
      day: DayInfo;
      /** The school holidays of today. `null` on a school day, a weekend or a public holiday. */
      currentBreak: Holiday | null;
      /** The first school day after today. `null` if the loaded data has none. */
      nextSchoolDay: string | null;
      /** The next school holidays that start after today. Single free days do not count. */
      nextBreak: { holiday: Holiday; schoolDays: number } | null;
      /** The next summer holidays, if they are not `nextBreak`. */
      summer: { holiday: Holiday; schoolDays: number } | null;
      /** The school days before today. */
      done: number;
      /** All school days of the school year. */
      total: number;
    };

export function describeToday(year: SchoolYear, today: string): Today {
  const { first, last } = schoolYearDays(year.startYear);
  if (today < first) {
    const firstSchoolDay =
      eachDay(first, last).find((date) => describeDay(date, year.holidays).schoolDay) ?? null;
    return { kind: "before", firstSchoolDay };
  }
  if (today > last) return { kind: "after" };

  const day = describeDay(today, year.holidays);
  const breaks = schoolBreaks(year.holidays);
  // Two school holidays can overlap. Then the one that lasts longer counts.
  const currentBreak =
    breaks
      .filter((holiday) => covers(holiday, today))
      .sort((a, b) => b.end.localeCompare(a.end))[0] ?? null;
  const loadedUntil = year.holidays.reduce(
    (latest, holiday) => (holiday.end > latest ? holiday.end : latest),
    last,
  );
  const nextSchoolDay =
    eachDay(addDays(today, 1), loadedUntil).find(
      (date) => describeDay(date, year.holidays).schoolDay,
    ) ?? null;
  const countTo = (holiday: Holiday) => ({
    holiday,
    schoolDays: schoolDaysUntil(holiday, today, year.holidays),
  });
  // A single free day (for example "Buß- und Bettag") is no "Ferien". The list shows it.
  const upcoming = breaks.filter(
    (holiday) => holiday.start > today && categoryOf(holiday) !== "frei",
  );
  const next = upcoming[0];
  const summer = upcoming.find((holiday) => categoryOf(holiday) === "sommer");
  return {
    kind: "during",
    day,
    currentBreak,
    nextSchoolDay,
    nextBreak: next ? countTo(next) : null,
    summer: summer && summer !== next ? countTo(summer) : null,
    done: countSchoolDays(first, addDays(today, -1), year.holidays),
    total: countSchoolDays(first, last, year.holidays),
  };
}
