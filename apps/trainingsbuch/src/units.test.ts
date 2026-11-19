import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog.ts";
import { showLine, type TextDisplay } from "./units.ts";

const WOMEN: TextDisplay = { units: "metric", loadsFor: "women" };

/** The line with the loads for men. */
function showUnits(line: string, units: TextDisplay["units"]): string {
  return showLine(line, { units, loadsFor: "men" });
}

describe("units in workout texts", () => {
  it("shows the metric or the imperial value", () => {
    const line = "150 wall-ball shots, 9/6 kg (20/14 lb) ball to 3/2.7 m (10/9 ft) target";
    expect(showUnits(line, "metric")).toBe("150 wall-ball shots, 9 kg ball to 3 m target");
    expect(showUnits(line, "imperial")).toBe("150 wall-ball shots, 20 lb ball to 10 ft target");
  });

  it("keeps the words between the two values", () => {
    expect(showUnits("1600 m run (1 mile)", "metric")).toBe("1600 m run");
    expect(showUnits("1600 m run (1 mile)", "imperial")).toBe("1 mile run");
    expect(showUnits("Monti: 51 cm (20 in) box", "imperial")).toBe("Monti: 20 Zoll box");
    expect(showUnits("Kettlebell, 32/24 kg (2/1.5 pood)", "imperial")).toBe("Kettlebell, 2 pood");
  });

  it("shows a box height always in inches, with the German word", () => {
    for (const system of ["metric", "imperial"] as const) {
      expect(showUnits("30 box jumps, 61/51 cm (24/20 in)", system)).toBe("30 box jumps, 24 Zoll");
      expect(showUnits("26 step-ups, 61/51 cm (24/20 in)", system)).toBe("26 step-ups, 24 Zoll");
    }
    // Other heights follow the unit system.
    const bar = "Pull-up bar ideally 15 cm (6 in) above max standing reach";
    expect(showUnits(bar, "metric")).toBe("Pull-up bar ideally 15 cm above max standing reach");
    expect(showUnits(bar, "imperial")).toBe("Pull-up bar ideally 6 in above max standing reach");
  });

  it("handles nested pairs and lines without a pair", () => {
    expect(showUnits("9.1 m (30 ft) walking lunge (2 × 4.6 m (15 ft))", "imperial")).toBe(
      "30 ft walking lunge (2 × 15 ft)",
    );
    expect(showUnits("400 m run with a plate, 20/11 kg (45/25 lb)", "imperial")).toBe(
      "400 m run with a plate, 45 lb",
    );
    expect(showUnits("For time:", "imperial")).toBe("For time:");
  });

  it("leaves no imperial unit in the metric texts of the catalog", () => {
    const metric = CATALOG.flatMap((workout) => workout.lines.map((l) => showUnits(l, "metric")));
    expect(metric.filter((line) => /\b(lb|ft|in|pood|miles?)\)/.test(line))).toEqual([]);
  });

  it("shows only the value for men or for women", () => {
    const line = "Thruster, 43/29 kg (95/65 lb)";
    expect(showLine(line, { units: "metric", loadsFor: "men" })).toBe("Thruster, 43 kg");
    expect(showLine(line, WOMEN)).toBe("Thruster, 29 kg");
    expect(showLine(line, { units: "imperial", loadsFor: "women" })).toBe("Thruster, 65 lb");
    expect(showLine("30 box jumps, 61/51 cm (24/20 in)", WOMEN)).toBe("30 box jumps, 20 Zoll");
    expect(showLine("3/2.7 m (10/9 ft) target", WOMEN)).toBe("2.7 m target");
    // A fraction has no unit.
    expect(showLine("23 back squats, 3/4 body weight", WOMEN)).toBe(
      "23 back squats, 3/4 body weight",
    );
  });

  it("leaves no pair of values with a unit in the catalog", () => {
    const lines = CATALOG.flatMap((workout) => workout.lines);
    for (const loadsFor of ["men", "women"] as const) {
      for (const units of ["metric", "imperial"] as const) {
        const shown = lines.map((line) => showLine(line, { units, loadsFor }));
        expect(
          shown.filter((line) => /\d\/\d[\d.,]* (kg|lb|cm|in|m|ft|pood|Zoll)\b/.test(line)),
        ).toEqual([]);
      }
    }
  });
});
