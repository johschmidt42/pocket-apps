/** The chart colors in palette order. The ETF at place n gets color n. Full class names, so that Tailwind finds them. */
const COLORS = [
  { color: "var(--chart-1)", swatchClass: "bg-chart-1" },
  { color: "var(--chart-2)", swatchClass: "bg-chart-2" },
  { color: "var(--chart-3)", swatchClass: "bg-chart-3" },
  { color: "var(--chart-4)", swatchClass: "bg-chart-4" },
  { color: "var(--chart-5)", swatchClass: "bg-chart-5" },
  { color: "var(--chart-6)", swatchClass: "bg-chart-6" },
  { color: "var(--chart-7)", swatchClass: "bg-chart-7" },
  { color: "var(--chart-8)", swatchClass: "bg-chart-8" },
] as const;

const OTHER = { color: "var(--chart-other)", swatchClass: "bg-chart-other" };

/** The color of the ETF at this place in the list (0 = first). */
export function etfColor(index: number): { color: string; swatchClass: string } {
  return COLORS[index] ?? OTHER;
}
