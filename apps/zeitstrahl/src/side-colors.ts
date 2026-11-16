import type { ResolvedSide } from "./layout.ts";

/**
 * One color per side. Thus a side can be a category, for example "Ausbildung" and "Beruf". For
 * SVG attributes (`fill`, `stroke`). For HTML elements, the classes `bg-chart-1` and so on give
 * the same colors.
 */
export const SIDE_COLORS: Record<ResolvedSide, string> = {
  left: "var(--chart-1)",
  right: "var(--chart-2)",
};
