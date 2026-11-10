import { describe, expect, it } from "vitest";
import { loadMessage } from "./load-message.ts";
import type { SchuljahrData } from "./schema.ts";
import { bayern2026 } from "./test-data.ts";
import { findYear, storedYears, storeAndSelect } from "./years.ts";

const by2026 = bayern2026();
const by2027 = { ...by2026, startYear: 2027 };
const nw2026 = { ...by2026, state: "DE-NW" as const };

describe("years", () => {
  it("stores a school year, sorted, and shows it", () => {
    let data: SchuljahrData = { selected: null, years: [] };
    data = storeAndSelect(data, by2027);
    data = storeAndSelect(data, nw2026);
    data = storeAndSelect(data, by2026);
    expect(data.selected).toEqual({ state: "DE-BY", startYear: 2026 });
    expect(data.years.map((year) => `${year.state} ${String(year.startYear)}`)).toEqual([
      "DE-BY 2026",
      "DE-BY 2027",
      "DE-NW 2026",
    ]);
    expect(storedYears(data, "DE-BY")).toEqual([2026, 2027]);
    expect(findYear(data, { state: "DE-NW", startYear: 2026 })).toBe(nw2026);
    expect(findYear(data, { state: "DE-NW", startYear: 2027 })).toBeUndefined();
  });

  it("replaces an older load of the same school year", () => {
    const newer = { ...by2026, fetchedAt: "2026-12-01T08:00:00.000Z" };
    const data = storeAndSelect(storeAndSelect({ selected: null, years: [] }, by2026), newer);
    expect(data.years).toEqual([newer]);
  });
});

describe("loadMessage", () => {
  it("explains each failed load in German", () => {
    const selection = { state: "DE-BY" as const, startYear: 2031 };
    expect(loadMessage({ kind: "offline" }, selection)).toMatch(/Keine Verbindung/);
    expect(loadMessage({ kind: "failed" }, selection)).toMatch(/OpenHolidays/);
    expect(loadMessage({ kind: "empty" }, selection)).toBe(
      "Für Bayern gibt es für das Schuljahr 2031/32 noch keine Ferientermine.",
    );
  });
});
