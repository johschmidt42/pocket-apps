/**
 * A wave as data: a block of enemies of one kind. They fly in from the two top corners,
 * take their places in the block, and the block moves to the left and to the right.
 * All lengths are in field units, all times in seconds.
 */
export type Wave = {
  columns: number;
  rows: number;
  /** The distance between two places of the block. */
  spacingX: number;
  spacingY: number;
  /** The height of the top row. */
  top: number;
  /** The block moves this far to each side, and needs this time for one full move to both sides. */
  swayDistance: number;
  swaySeconds: number;
  /** One enemy needs this time from the corner to its place. */
  entrySeconds: number;
  /** The enemies of one corner start one after the other, with this time between two of them. */
  entryGapSeconds: number;
};

/** The wave of the prototype: 40 flying ants in 4 rows of 10. */
export const FIRST_WAVE: Wave = {
  columns: 10,
  rows: 4,
  spacingX: 120,
  spacingY: 85,
  top: 330,
  swayDistance: 180,
  swaySeconds: 6,
  entrySeconds: 2.2,
  entryGapSeconds: 0.12,
};
