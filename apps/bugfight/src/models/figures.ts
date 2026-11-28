import { ant } from "./ant.ts";
import type { Figure } from "./model.ts";
import { seven } from "./seven.ts";

/**
 * All figures of the game. A test checks each of them.
 * The model viewer of the prototype branch shows them in this order.
 */
export const FIGURES: Figure[] = [seven, ant];
