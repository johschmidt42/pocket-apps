import type { SchoolYear, SchuljahrData, Selection } from "./schema.ts";
import type { StateCode } from "./states.ts";

const sameSchoolYear = (a: Selection, b: Selection) =>
  a.state === b.state && a.startYear === b.startYear;

export function findYear(data: SchuljahrData, selection: Selection): SchoolYear | undefined {
  return data.years.find((year) => sameSchoolYear(year, selection));
}

/** Stores a loaded school year (it replaces an older load of it) and selects it for the screen. */
export function storeAndSelect(data: SchuljahrData, year: SchoolYear): SchuljahrData {
  const others = data.years.filter((entry) => !sameSchoolYear(entry, year));
  return {
    selected: { state: year.state, startYear: year.startYear },
    years: [...others, year].sort(
      (a, b) => a.state.localeCompare(b.state) || a.startYear - b.startYear,
    ),
  };
}

/** The start years that the data file has for a state. */
export function storedYears(data: SchuljahrData, state: StateCode): number[] {
  return data.years.filter((year) => year.state === state).map((year) => year.startYear);
}
