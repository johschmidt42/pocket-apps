// Overhead Carry with a barbell (Paul: "overhead walk", 84/57 kg): the walk of `farmers-carry.ts`, with the
// bar locked out over the head, as at the end of the jerk in `clean-and-jerk.ts`. The bar stays over the middle of the
// feet. The arms do not swing.
import type { Exercise } from "../exercise.ts";
import { farmersCarry, tall } from "./farmers-carry.ts";
import { overhead, SHRUG } from "./overhead-carry.ts";

/** The grip of the jerk. */
const GRIP = 16;

export const OVERHEAD_CARRY_BARBELL: Exercise = tall(
  farmersCarry({
    key: "overhead-carry-barbell",
    title: "Overhead Carry (Langhantel)",
    equipment: { kind: "barbell" },
    grip: GRIP,
    upper: (_part, hip, lean) => ({
      hands: overhead(hip, lean, GRIP, 2),
      grip: GRIP,
      shrug: SHRUG,
      head: 4,
    }),
  }),
);
