import { describe, expect, it } from "vitest";
import { chartHeightClass } from "./chart-height.ts";

describe("chartHeightClass", () => {
  it.each([
    [1, "h-64"],
    [6, "h-80"],
    [9, "h-[28rem]"],
    [12, "h-[36rem]"],
    [16, "h-[48rem]"],
    [30, "h-[60rem]"],
  ])("gives %d rows the class %s", (rows, className) => {
    expect(chartHeightClass(rows)).toBe(className);
  });
});
