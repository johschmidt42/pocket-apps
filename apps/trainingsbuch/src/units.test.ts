import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog.ts";
import { showUnits } from "./units.ts";

describe("units in workout texts", () => {
  it("shows the metric or the imperial value", () => {
    const line = "150 wall-ball shots, 9/6 kg (20/14 lb) ball to 3/2.7 m (10/9 ft) target";
    expect(showUnits(line, "metric")).toBe("150 wall-ball shots, 9/6 kg ball to 3/2.7 m target");
    expect(showUnits(line, "imperial")).toBe(
      "150 wall-ball shots, 20/14 lb ball to 10/9 ft target",
    );
  });

  it("keeps the words between the two values", () => {
    expect(showUnits("1600 m run (1 mile)", "metric")).toBe("1600 m run");
    expect(showUnits("1600 m run (1 mile)", "imperial")).toBe("1 mile run");
    expect(showUnits("Monti: 51 cm (20 in) box", "imperial")).toBe("Monti: 20 Zoll box");
    expect(showUnits("Kettlebell, 32/24 kg (2/1.5 pood)", "imperial")).toBe(
      "Kettlebell, 2/1.5 pood",
    );
  });

  it("shows a box height always in inches, with the German word", () => {
    for (const system of ["metric", "imperial"] as const) {
      expect(showUnits("30 box jumps, 61/51 cm (24/20 in)", system)).toBe(
        "30 box jumps, 24/20 Zoll",
      );
    }
  });

  it("handles nested pairs and lines without a pair", () => {
    expect(showUnits("9.1 m (30 ft) walking lunge (2 × 4.6 m (15 ft))", "imperial")).toBe(
      "30 ft walking lunge (2 × 15 ft)",
    );
    expect(showUnits("400 m run with a plate, 20/11 kg (45/25 lb)", "imperial")).toBe(
      "400 m run with a plate, 45/25 lb",
    );
    expect(showUnits("For time:", "imperial")).toBe("For time:");
  });

  it("leaves no imperial unit in the metric texts of the catalog", () => {
    const metric = CATALOG.flatMap((workout) => workout.lines.map((l) => showUnits(l, "metric")));
    expect(metric.filter((line) => /\b(lb|ft|in|pood|miles?)\)/.test(line))).toEqual([]);
  });
});
