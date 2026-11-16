import { Tooltip, TooltipContent, TooltipTrigger } from "@pocket-apps/ui/components/tooltip";
import type { ReactElement } from "react";
import { BUBBLE_ATTRIBUTE } from "./use-active-card.ts";

export type HintTooltipProps = {
  /** The short hint, for example "Ausblenden". */
  hint: string;
  side: "top" | "right" | "bottom" | "left";
  /** The button. It must accept a ref and the props of the trigger. */
  children: ReactElement;
};

/**
 * A short hint at a button in the timeline. It shows at once (the `TooltipProvider` of the app has
 * no delay), not after the delay of a `title` attribute. Like a description bubble, it lets the
 * mouse through and closes as soon as the mouse leaves the button. Its attribute
 * `data-leaf-bubble` tells `useActiveCard()` to look for the card below it. Else the box of Radix
 * around the hint could cover a card and keep the card from its hover.
 */
export function HintTooltip({ hint, side, children }: HintTooltipProps) {
  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="pointer-events-none" {...{ [BUBBLE_ATTRIBUTE]: "" }}>
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
