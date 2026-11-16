import { afterEach, describe, expect, it } from "vitest";
import { BRANCH_ATTRIBUTE, BUBBLE_ATTRIBUTE, CARD_ATTRIBUTE, cardAt } from "./use-active-card.ts";

/** A card with a title, and a Radix box with a description bubble in it. */
function setUp() {
  document.body.innerHTML = `
    <div ${CARD_ATTRIBUTE}="study"><span id="title">Studium</span></div>
    <div id="box"><div ${BUBBLE_ATTRIBUTE}><p id="text">Text</p></div></div>
    <svg><path id="branch" ${BRANCH_ATTRIBUTE}="study" /><path id="other" ${BRANCH_ATTRIBUTE}="x" /></svg>
  `;
  const byId = (id: string) => document.getElementById(id)!;
  return { card: document.querySelector(`[${CARD_ATTRIBUTE}]`), byId };
}

describe("cardAt", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    Reflect.deleteProperty(document, "elementsFromPoint");
  });

  it("finds the card around the target", () => {
    const { card, byId } = setUp();
    expect(cardAt(byId("title"), 0, 0)).toBe(card);
    expect(cardAt(document.body, 0, 0)).toBeNull();
    expect(cardAt(null, 0, 0)).toBeNull();
  });

  it("finds the card of a branch", () => {
    const { card, byId } = setUp();
    expect(cardAt(byId("branch"), 0, 0)).toBe(card);
    // A branch without a card on the timeline.
    expect(cardAt(byId("other"), 0, 0)).toBeNull();
  });

  it("finds the card below a description bubble", () => {
    const { card, byId } = setUp();
    // jsdom has no layout. This replaces the browser API: the bubble box is above the title.
    document.elementsFromPoint = () => [byId("box"), byId("title"), document.body];
    expect(cardAt(byId("box"), 10, 10)).toBe(card);
    expect(cardAt(byId("text"), 10, 10)).toBe(card);

    document.elementsFromPoint = () => [byId("box")];
    expect(cardAt(byId("box"), 10, 10)).toBeNull();
  });
});
