import { A4, type PageSlice } from "./pages.ts";

/** A section, or an entry of a section, that the editor and the preview highlight. */
export type HighlightTarget = { sectionId: string; entryId: string | null };

export function sameTarget(a: HighlightTarget | null, b: HighlightTarget | null): boolean {
  return a?.sectionId === b?.sectionId && a?.entryId === b?.entryId;
}

/** An attribute selector, for example `[data-entry-id="a1"]`. JSON quotes the ID for CSS. */
function byId(attribute: "data-section-id" | "data-entry-id", id: string): string {
  return `[${attribute}=${JSON.stringify(id)}]`;
}

/** The section and the entry of an element of the CV. */
export function targetOf(element: Element | undefined): HighlightTarget | null {
  const sectionId = element?.closest("[data-section-id]")?.getAttribute("data-section-id");
  if (!sectionId) return null;
  const entryId = element?.closest("[data-entry-id]")?.getAttribute("data-entry-id") ?? null;
  return { sectionId, entryId };
}

/**
 * Finds the entry (or else the section) under the mouse in the sheets of the pages. The sheets
 * are copies that take no mouse events (`inert`). Thus the function computes the place in the
 * measured copy (`flow`): the page under the mouse, the height in the CV, the element there.
 */
export function targetInPages(
  cvDocument: Document,
  flow: HTMLElement,
  pages: readonly PageSlice[],
  x: number,
  y: number,
): HighlightTarget | null {
  const sheet = flow.firstElementChild;
  if (!sheet) return null;
  const box = sheet.getBoundingClientRect();
  const pixelsPerMm = box.width / A4.width;
  const clips = Array.from(cvDocument.querySelectorAll(".cv-clip"));
  const index = clips.findIndex((clip) => {
    const rect = clip.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
  const clip = clips[index];
  const page = pages[index];
  if (!clip || !page) return null;
  const height = page.start + (y - clip.getBoundingClientRect().top) / pixelsPerMm;
  const at = (selector: string) =>
    Array.from(flow.querySelectorAll(selector)).find((element) => {
      const rect = element.getBoundingClientRect();
      const top = (rect.top - box.top) / pixelsPerMm;
      const bottom = (rect.bottom - box.top) / pixelsPerMm;
      return height >= top && height <= bottom;
    });
  return targetOf(at("[data-entry-id]") ?? at("[data-section-id]"));
}

/** The CSS of the highlight (screen only): the entry, or the section without an entry. */
export function highlightCss(target: HighlightTarget | null): string {
  if (target === null) return "";
  const selector =
    target.entryId === null
      ? byId("data-section-id", target.sectionId)
      : byId("data-entry-id", target.entryId);
  return `@media screen {
  ${selector} {
    outline: 0.5mm solid rgb(28 25 23 / 45%); outline-offset: -0.5mm; background-color: rgb(28 25 23 / 5%);
  }
}`;
}
