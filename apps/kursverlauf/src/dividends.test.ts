import { describe, expect, it } from "vitest";
import { dividendSummary } from "./dividends.ts";
import { point } from "./test-data.ts";

const today = new Date(2026, 10, 10);
const dividends = [
  { date: "2024-12-20", amount: 0.5 },
  { date: "2025-09-19", amount: 0.3 },
  { date: "2025-12-19", amount: 0.4 },
  { date: "2026-03-20", amount: 0.4 },
  { date: "2026-06-19", amount: 0.8 },
  { date: "2026-09-18", amount: 0.4 },
];

describe("dividendSummary", () => {
  it("adds the last 12 months and each year and lists the newest payments", () => {
    const summary = dividendSummary(dividends, [point("2026-11-06", 100)], today);

    expect(summary?.last12Months).toBeCloseTo(2);
    expect(summary?.yield).toBeCloseTo(0.02);
    expect(summary?.byYear.map((entry) => entry.year)).toEqual([2026, 2025, 2024]);
    expect(summary?.byYear[0]?.sum).toBeCloseTo(1.6);
    expect(summary?.recent.map((entry) => entry.date)).toEqual([
      "2026-09-18",
      "2026-06-19",
      "2026-03-20",
      "2025-12-19",
    ]);
  });

  it("gives nothing without dividends or without prices", () => {
    expect(dividendSummary([], [point("2026-11-06", 100)], today)).toBeNull();
    expect(dividendSummary(dividends, [], today)).toBeNull();
  });
});
