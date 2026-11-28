import { ant } from "./ant.ts";
import type { Figure } from "./model.ts";
import { seven } from "./seven.ts";

/** All figures of the game. The model viewer shows them in this order. */
export const FIGURES: Figure[] = [seven, ant];
