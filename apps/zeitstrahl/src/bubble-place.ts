import type { ResolvedSide } from "./layout.ts";

/** The length of the stem between a card and its description bubble. */
export const STEM_LENGTH = 14;

/** The stem and a margin to the window edge (8 px). */
const STEM_AND_MARGIN = STEM_LENGTH + 8;

/** The widths of the description bubble, from wide to narrow. */
export const BUBBLE_WIDTHS = [320, 240, 200] as const;

export type BubbleWidth = (typeof BUBBLE_WIDTHS)[number];

export type BubblePlace = { side: ResolvedSide | "top"; width: BubbleWidth };

/**
 * Where the description bubble of a card goes, and how wide it is. It goes to the outer side of
 * the card (away from the trunk), with the widest width that fits there. If not even the narrowest
 * width fits, it goes above the card with the widest width.
 *
 * The bubble must fit completely: else Radix flips it to the inner side, over the trunk.
 */
export function bubblePlace(
  card: { left: number; right: number },
  windowWidth: number,
  outward: ResolvedSide,
): BubblePlace {
  const space = (outward === "left" ? card.left : windowWidth - card.right) - STEM_AND_MARGIN;
  const width = BUBBLE_WIDTHS.find((each) => each <= space);
  return width ? { side: outward, width } : { side: "top", width: 320 };
}
