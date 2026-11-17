import { describe, expect, it } from "vitest";
import { formatAxisDay, formatDay, formatShortDay, isoDay } from "./dates.ts";

describe("dates", () => {
  it("gives the local day as ISO date", () => {
    expect(isoDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(isoDay(new Date(2026, 10, 17))).toBe("2026-11-17");
  });

  it("formats a day in German", () => {
    expect(formatDay("2026-11-17")).toBe("Di., 17.11.2026");
    expect(formatShortDay("2026-11-07")).toBe("07.11.2026");
    expect(formatAxisDay("2026-11-07")).toBe("07.11.26");
  });
});
