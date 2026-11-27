// Barbell Farmers Carry (Thompson: "barbell farmers carry", 61/43 kg): the walk of `farmers-carry.ts` with a
// barbell in each hand. The hand holds the middle of the bar, and the bar points along the way.
import type { Exercise } from "../exercise.ts";
import { farmersCarry, wide } from "./farmers-carry.ts";

export const FARMERS_CARRY_BARBELL: Exercise = wide(
  farmersCarry({
    key: "farmers-carry-barbell",
    title: "Farmers Carry (Langhanteln)",
    equipment: { kind: "carrybars" },
    grip: 23,
  }),
);
