import { describe, expect, it } from "vitest";
import {
  commonStart,
  comparisonChanges,
  comparisonRows,
  pointsInRange,
  rangeStart,
  rangeStats,
} from "./ranges.ts";
import { point } from "./test-data.ts";

const today = new Date(2026, 10, 10);
const points = [
  point("2020-01-03", 50),
  point("2025-11-14", 100),
  point("2026-03-06", 80),
  point("2026-06-05", 120),
  point("2026-11-06", 110),
];

describe("ranges", () => {
  it("finds the start of each range", () => {
    expect(rangeStart("6m", today)).toBe("2026-05-10");
    expect(rangeStart("1y", today)).toBe("2025-11-10");
    expect(rangeStart("5y", today)).toBe("2021-11-10");
    expect(rangeStart("max", today)).toBeNull();
    // August 31 minus 6 months is February 28, not March 3.
    expect(rangeStart("6m", new Date(2026, 7, 31))).toBe("2026-02-28");
  });

  it("keeps the points of the range", () => {
    expect(pointsInRange(points, "1y", today).map((entry) => entry.date)).toEqual([
      "2025-11-14",
      "2026-03-06",
      "2026-06-05",
      "2026-11-06",
    ]);
    expect(pointsInRange(points, "max", today)).toHaveLength(5);
  });

  it("finds the change, the high and the low", () => {
    const stats = rangeStats(pointsInRange(points, "1y", today));

    expect(stats?.change).toBeCloseTo(0.1);
    expect(stats?.high).toEqual(point("2026-06-05", 120));
    expect(stats?.low).toEqual(point("2026-03-06", 80));
    expect(rangeStats([])).toBeNull();
  });

  it("starts all series at the first date that all of them have", () => {
    const series = [
      {
        key: "a",
        points: [point("2026-01-02", 100), point("2026-01-09", 110), point("2026-01-16", 121)],
      },
      { key: "b", points: [point("2026-01-09", 50), point("2026-01-16", 25)] },
      { key: "c", points: [] },
    ];

    expect(commonStart(series)).toBe("2026-01-09");
    expect(commonStart([])).toBeNull();
    const rows = comparisonRows(series);
    expect(rows.map((row) => row.date)).toEqual(["2026-01-09", "2026-01-16"]);
    expect(rows[0]).toEqual({ date: "2026-01-09", a: 0, b: 0 });
    expect(rows[1]?.a).toBeCloseTo(10);
    expect(rows[1]?.b).toBeCloseTo(-50);
    const changes = comparisonChanges(series);
    expect(changes.map((change) => change.key)).toEqual(["a", "b"]);
    expect(changes[0]?.change).toBeCloseTo(0.1);
  });
});
