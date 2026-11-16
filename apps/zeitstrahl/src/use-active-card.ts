import { isOneOf } from "@pocket-apps/core/one-of";
import { useEffect, useState } from "react";
import { bubblePlace, type BubblePlace } from "./bubble-place.ts";
import { RESOLVED_SIDES } from "./layout.ts";

/** The attribute that marks a card. Its value is the ID of the entry of the card. */
export const CARD_ATTRIBUTE = "data-entry-id";
/** The attribute of a card with its outer side: `left` or `right`. */
export const OUTWARD_ATTRIBUTE = "data-outward";
/** The attribute of a branch (and of the ring of a point). Its value is the ID of the entry. */
export const BRANCH_ATTRIBUTE = "data-branch-of";
/** The attribute that marks a tooltip that lets the mouse through: a description bubble or a hint. */
export const BUBBLE_ATTRIBUTE = "data-leaf-bubble";

export type ActiveCard = {
  /** The ID of the entry whose card is under the mouse or has the keyboard focus. */
  id: string | null;
  /** `true` after Escape or a click on the card: the bubble stays closed for this card. */
  dismissed: boolean;
  /**
   * Where the bubble of each card goes, and how wide it is. The app computes it when the card
   * becomes active. A card keeps its place after it is no longer active: its bubble fades out at
   * the same place. A place for all cards would move a fading bubble to the place of the new card.
   */
  places: ReadonlyMap<string, BubblePlace>;
};

/** The place of a bubble before its card was active. */
export const DEFAULT_PLACE: BubblePlace = { side: "top", width: 320 };

const START: ActiveCard = { id: null, dismissed: false, places: new Map() };

/** No active card. The places stay. */
function none(current: ActiveCard): ActiveCard {
  return current.id === null && !current.dismissed
    ? current
    : { ...current, id: null, dismissed: false };
}

/**
 * `true` for a description bubble and for the box that Radix puts around it. The bubble lets the
 * mouse through, but the box of Radix does not. Thus the mouse can be on the box.
 */
function isBubble(element: Element): boolean {
  return (
    element.closest(`[${BUBBLE_ATTRIBUTE}]`) !== null ||
    element.querySelector(`:scope > [${BUBBLE_ATTRIBUTE}]`) !== null
  );
}

/** The card of an element: the card around it, or the card of the branch around it. */
function cardOf(element: Element | undefined): Element | null {
  const card = element?.closest(`[${CARD_ATTRIBUTE}]`);
  if (card) return card;
  const id = element?.closest(`[${BRANCH_ATTRIBUTE}]`)?.getAttribute(BRANCH_ATTRIBUTE);
  if (id === undefined || id === null) return null;
  const cards = [...document.querySelectorAll(`[${CARD_ATTRIBUTE}]`)];
  return cards.find((each) => each.getAttribute(CARD_ATTRIBUTE) === id) ?? null;
}

/**
 * The card under the mouse. On a branch, it is the card of the branch. If the mouse is on a
 * description bubble, it is the card below the bubble.
 */
export function cardAt(target: EventTarget | null, x: number, y: number): Element | null {
  if (!(target instanceof Element)) return null;
  if (!isBubble(target)) return cardOf(target);
  return cardOf(document.elementsFromPoint(x, y).find((element) => !isBubble(element)));
}

/**
 * Makes the card active, or no card if `card` is `null`. Keeps the current state if the card did
 * not change. Thus a mouse move in a card costs nothing.
 */
function moveTo(card: Element | null) {
  return (current: ActiveCard): ActiveCard => {
    const id = card?.getAttribute(CARD_ATTRIBUTE) ?? null;
    if (id === current.id) return current;
    const outward = card?.getAttribute(OUTWARD_ATTRIBUTE) ?? "";
    if (!card || id === null || !isOneOf(RESOLVED_SIDES, outward)) return none(current);
    const place = bubblePlace(card.getBoundingClientRect(), window.innerWidth, outward);
    return { id, dismissed: false, places: new Map(current.places).set(id, place) };
  };
}

/**
 * The active card of the timeline: the card under the mouse (also on its branch), or the card with
 * the keyboard focus.
 * The hook listens to each mouse move in the document and asks which card is under the mouse. It
 * does not use the enter and leave events of each card: when such an event got lost, the old way
 * kept a wrong card active.
 *
 * A scroll moves the cards under a resting mouse. During a scroll, no card is active. At the end
 * of the scroll, the card under the mouse becomes active.
 *
 * A card must have the attributes `data-entry-id` and `data-outward`. A description bubble must
 * have the attribute `data-leaf-bubble`.
 */
export function useActiveCard() {
  const [active, setActive] = useState<ActiveCard>(START);

  useEffect(() => {
    let pointer: { target: EventTarget | null; x: number; y: number } | null = null;
    const onMove = (event: PointerEvent) => {
      pointer = { target: event.target, x: event.clientX, y: event.clientY };
      setActive(moveTo(cardAt(event.target, event.clientX, event.clientY)));
    };
    const onLeave = () => {
      pointer = null;
      setActive(none);
    };
    const onScroll = () => {
      setActive(none);
    };
    const onScrollEnd = () => {
      if (!pointer) return;
      const below = document.elementFromPoint(pointer.x, pointer.y);
      setActive(moveTo(cardAt(below, pointer.x, pointer.y)));
    };
    const root = document.documentElement;
    document.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("scrollend", onScrollEnd, { capture: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("scrollend", onScrollEnd, { capture: true });
    };
  }, []);

  return {
    active,
    /** For focus events: the card around the target becomes active. */
    track: (target: EventTarget | null) => {
      setActive(moveTo(target instanceof Element ? target.closest(`[${CARD_ATTRIBUTE}]`) : null));
    },
    clear: () => {
      setActive(none);
    },
    dismiss: () => {
      setActive((current) => ({ ...current, dismissed: true }));
    },
  };
}
