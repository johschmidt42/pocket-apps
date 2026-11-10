import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_INFO, categoryOf } from "./categories.ts";

describe("categories", () => {
  it("sorts the names of OpenHolidays into kinds", () => {
    const school = (name: string) => categoryOf({ kind: "school", name });
    expect(school("Herbstferien")).toBe("herbst");
    expect(school("Weihnachtsferien")).toBe("weihnachten");
    expect(school("Halbjahresferien")).toBe("winter");
    expect(school("Fastnachtsferien")).toBe("winter");
    expect(school("Osterferien")).toBe("ostern");
    expect(school("Pfingstferien")).toBe("pfingsten");
    expect(school("Sommerferien")).toBe("sommer");
    expect(school("Buß- und Bettag")).toBe("frei");
    expect(categoryOf({ kind: "public", name: "Ostermontag" })).toBe("feiertag");
  });

  it("gives each kind its own chart color, in the order of the school year", () => {
    expect(CATEGORIES.map((category) => CATEGORY_INFO[category].dotClass)).toEqual([
      "bg-chart-1",
      "bg-chart-2",
      "bg-chart-3",
      "bg-chart-4",
      "bg-chart-5",
      "bg-chart-6",
      "bg-chart-7",
      "bg-chart-8",
    ]);
  });
});
