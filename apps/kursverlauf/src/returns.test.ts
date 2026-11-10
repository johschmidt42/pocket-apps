import { describe, expect, it } from "vitest";
import { averageReturn, yearlyReturns } from "./returns.ts";
import { point } from "./test-data.ts";

const today = new Date(2026, 10, 10);
const points = [
  point("2024-05-03", 100),
  point("2024-12-27", 110),
  point("2025-06-06", 90),
  point("2025-12-26", 121),
  point("2026-11-06", 133.1),
];

describe("yearlyReturns", () => {
  it("compares the last close of each year with the last close of the year before", () => {
    const returns = yearlyReturns(points, today);

    expect(returns.map((entry) => [entry.year, entry.partial])).toEqual([
      [2024, true],
      [2025, false],
      [2026, true],
    ]);
    expect(returns[0]?.change).toBeCloseTo(0.1);
    expect(returns[1]?.change).toBeCloseTo(0.1);
    expect(returns[2]?.change).toBeCloseTo(0.1);
    expect(yearlyReturns([], today)).toEqual([]);
  });
});

describe("averageReturn", () => {
  it("gives the compound return per year since the first close", () => {
    const average = averageReturn([point("2020-01-03", 100), point("2022-01-03", 121)]);

    expect(average?.since).toBe("2020-01-03");
    expect(average?.rate).toBeCloseTo(0.1, 2);
    expect(averageReturn([point("2020-01-03", 100)])).toBeNull();
    // Less than 1 year: no average.
    expect(averageReturn([point("2026-01-02", 100), point("2026-01-16", 102)])).toBeNull();
    expect(averageReturn([])).toBeNull();
  });
});
