import { describe, expect, it } from "vitest";
import { etfColor } from "./colors.ts";

describe("etfColor", () => {
  it("gives the palette in order and gray after 8 ETFs", () => {
    expect(etfColor(0)).toEqual({ color: "var(--chart-1)", swatchClass: "bg-chart-1" });
    expect(etfColor(7).color).toBe("var(--chart-8)");
    expect(etfColor(8).color).toBe("var(--chart-other)");
  });
});
