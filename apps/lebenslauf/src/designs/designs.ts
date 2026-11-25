import { DESIGN_NAMES, type Design } from "../schema.ts";
// The CSS of a design is text for the CV frame. It never applies to the app itself.
import klassischCss from "./klassisch.css?inline";
import modernCss from "./modern.css?inline";
import projektprofilCss from "./projektprofil.css?inline";

/** All designs, in the order of the select box. */
export const DESIGNS = DESIGN_NAMES;

/**
 * The German name and the CSS of each design. `pageMargin` is the space at the top and at the
 * bottom of each page in mm: the padding of the CV sheet. In print, the padding repeats on each
 * page (`box-decoration-break: clone`), and the `@page` margin is 0.
 */
export const DESIGN_INFO: Record<Design, { label: string; css: string; pageMargin: number }> = {
  klassisch: { label: "Klassisch", css: klassischCss, pageMargin: 12 },
  modern: { label: "Modern", css: modernCss, pageMargin: 12 },
  projektprofil: { label: "Projektprofil", css: projektprofilCss, pageMargin: 12 },
};
