import { describe, expect, it } from "vitest";
import {
  loadDays,
  schoolYearDays,
  schoolYearLabel,
  startYearOf,
  yearChoices,
} from "./school-years.ts";
import { isStateCode, stateName } from "./states.ts";

describe("school years", () => {
  it("starts a school year on August 1", () => {
    expect(startYearOf("2026-07-31")).toBe(2025);
    expect(startYearOf("2026-08-01")).toBe(2026);
    expect(startYearOf("2027-01-15")).toBe(2026);
  });

  it("names the school year and gives its days", () => {
    expect(schoolYearLabel(2026)).toBe("2026/27");
    expect(schoolYearLabel(2099)).toBe("2099/00");
    expect(schoolYearDays(2026)).toEqual({ first: "2026-08-01", last: "2027-07-31" });
    expect(loadDays(2026)).toEqual({ from: "2026-08-01", to: "2027-09-30" });
  });

  it("offers last year, this year, 3 years ahead and the stored years", () => {
    expect(yearChoices("2026-11-10", [])).toEqual([2025, 2026, 2027, 2028, 2029]);
    expect(yearChoices("2026-11-10", [2021, 2027])).toEqual([2021, 2025, 2026, 2027, 2028, 2029]);
  });
});

describe("states", () => {
  it("knows the 16 codes and their names", () => {
    expect(isStateCode("DE-BY")).toBe(true);
    expect(isStateCode("DE-XX")).toBe(false);
    expect(stateName("DE-NW")).toBe("Nordrhein-Westfalen");
  });
});
