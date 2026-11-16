/**
 * The page breaks of the preview. They follow the rules of the print CSS of a design:
 * a block with `break-inside: avoid` is never split, and a title with `break-after: avoid`
 * stays with the next block. All values are in mm, from the top of the CV sheet.
 */

/** The size of an A4 page in mm. */
export const A4 = { width: 210, height: 297 };

/** A block that must stay on one page. */
export type PageUnit = {
  top: number;
  bottom: number;
  /** A title: it goes to the next page together with the block after it. */
  keepWithNext: boolean;
};

/** One page of the preview: the part of the CV from `start`, `height` mm high. */
export type PageSlice = { start: number; height: number };

/** Rounding of the measured positions (less than 0.1 mm). */
const EPSILON = 0.1;

/**
 * Splits the CV into pages. A block that is higher than a page is split at the end of the page.
 * `contentStart` is the top margin of a page, `pageHeight` the height
 * of the content of one page (A4 without the top and the bottom margin).
 */
export function paginate(
  units: readonly PageUnit[],
  contentStart: number,
  pageHeight: number,
): PageSlice[] {
  const starts = [contentStart];
  let pageStart = contentStart;
  units.forEach((unit, index) => {
    if (unit.bottom - pageStart <= pageHeight + EPSILON) return;
    if (unit.top > pageStart + EPSILON) {
      const previous = units[index - 1];
      const start =
        previous?.keepWithNext && previous.top > pageStart + EPSILON ? previous.top : unit.top;
      starts.push(start);
      pageStart = start;
    }
    // A block that is higher than a page: the print splits it at the end of each page.
    while (unit.bottom - pageStart > pageHeight + EPSILON) {
      pageStart += pageHeight;
      starts.push(pageStart);
    }
  });
  const end = Math.max(contentStart, ...units.map((unit) => unit.bottom));
  return starts.map((start, index) => ({
    start,
    height: Math.min(pageHeight, (starts[index + 1] ?? end) - start),
  }));
}
