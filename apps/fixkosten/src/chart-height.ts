/**
 * A Tailwind height class for a chart with `rows` rows (bars or nodes in one column).
 * Full class names, so that Tailwind finds them.
 */
export function chartHeightClass(rows: number): string {
  if (rows <= 4) return "h-64";
  if (rows <= 7) return "h-80";
  if (rows <= 10) return "h-[28rem]";
  if (rows <= 14) return "h-[36rem]";
  if (rows <= 18) return "h-[48rem]";
  return "h-[60rem]";
}
