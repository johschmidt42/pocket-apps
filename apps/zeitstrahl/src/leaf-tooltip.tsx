import { Tooltip, TooltipContent, TooltipTrigger } from "@pocket-apps/ui/components/tooltip";
import type { ReactElement } from "react";
import { STEM_LENGTH, type BubblePlace } from "./bubble-place.ts";
import { DescriptionText } from "./description-text.tsx";
import type { ResolvedSide } from "./layout.ts";
import { SIDE_COLORS } from "./side-colors.ts";
import { BUBBLE_ATTRIBUTE } from "./use-active-card.ts";

/**
 * The width classes of the bubble (see `bubblePlace()`). Above the card, the bubble is also never
 * wider than the window.
 */
const WIDTHS = {
  320: "max-w-80",
  240: "max-w-60",
  200: "max-w-50",
  top: "max-w-[min(20rem,calc(100vw-1rem))]",
} as const;

/** The border of the bubble, in the color of the side. */
const BORDERS = { left: "border-chart-1/40", right: "border-chart-2/40" } as const;

/**
 * The stem for each side of the bubble (where Radix puts the bubble, `data-side`). Each stem is
 * 8 px wide at the card and 2 px wide at the bubble.
 */
const STEMS = [
  {
    // Bubble above the card: the stem goes down to the card.
    className: "absolute top-full left-1/2 hidden -translate-x-1/2 group-data-[side=top]/tip:block",
    width: 10,
    height: STEM_LENGTH,
    d: "M 4 0 C 4 7 1 7 1 14 L 9 14 C 9 7 6 7 6 0 Z",
  },
  {
    // Bubble below the card: the stem goes up to the card.
    className:
      "absolute bottom-full left-1/2 hidden -translate-x-1/2 group-data-[side=bottom]/tip:block",
    width: 10,
    height: STEM_LENGTH,
    d: "M 1 0 C 1 7 4 7 4 14 L 6 14 C 6 7 9 7 9 0 Z",
  },
  {
    // Bubble left of the card: the stem goes right to the card.
    className:
      "absolute top-1/2 left-full hidden -translate-y-1/2 group-data-[side=left]/tip:block",
    width: STEM_LENGTH,
    height: 10,
    d: "M 0 4 C 7 4 7 1 14 1 L 14 9 C 7 9 7 6 0 6 Z",
  },
  {
    // Bubble right of the card: the stem goes left to the card.
    className:
      "absolute top-1/2 right-full hidden -translate-y-1/2 group-data-[side=right]/tip:block",
    width: STEM_LENGTH,
    height: 10,
    d: "M 0 1 C 7 1 7 4 14 4 L 14 6 C 7 6 7 9 0 9 Z",
  },
];

export type LeafTooltipProps = {
  /** `true` shows the bubble. The timeline decides it (see `useActiveCard`), not Radix. */
  open: boolean;
  place: BubblePlace;
  /** Escape closes the bubble. */
  onEscape: () => void;
  /** The description, with lists and bold text (see `description.ts`). */
  text: string;
  /** The color side of the entry: `left` is `--chart-1`, `right` is `--chart-2`. */
  colorSide: ResolvedSide;
  /** The card. It must accept a ref and the props of the trigger. */
  children: ReactElement;
};

/**
 * Shows the description of an entry next to its card, at the side away from the trunk, or above
 * the card (see `bubblePlace()`). The bubble has the color of the card. A stem connects it with
 * the card, like the branch connects the card with the trunk: thick at the card, thin at the
 * bubble. The bubble has nothing to click. Thus it lets the mouse through: else it would cover
 * the cards near it.
 */
export function LeafTooltip({
  open,
  place,
  onEscape,
  text,
  colorSide,
  children,
}: LeafTooltipProps) {
  const color = SIDE_COLORS[colorSide];
  return (
    <Tooltip open={open}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={place.side}
        sideOffset={STEM_LENGTH}
        onEscapeKeyDown={onEscape}
        {...{ [BUBBLE_ATTRIBUTE]: "" }}
        // `*:last:hidden` hides the arrow of the tooltip: the stem replaces it.
        className={`group/tip pointer-events-none relative ${place.side === "top" ? WIDTHS.top : WIDTHS[place.width]} rounded-[1rem_0.375rem] border bg-card px-3.5 py-2.5 text-card-foreground shadow-md *:last:hidden ${BORDERS[colorSide]}`}
      >
        <DescriptionText text={text} />
        {STEMS.map((stem) => (
          <svg
            key={stem.className}
            aria-hidden="true"
            width={stem.width}
            height={stem.height}
            viewBox={`0 0 ${String(stem.width)} ${String(stem.height)}`}
            className={stem.className}
          >
            <path d={stem.d} fill={color} fillOpacity={0.35} stroke={color} strokeOpacity={0.8} />
          </svg>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
