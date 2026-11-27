// Single-arm Barbell Farmers Carry (Tama: "single-arm barbell farmers carry"): the walk of `farmers-carry.ts`
// with one barbell in the near hand. The free hand hangs and swings a little, as with a load: the engine cannot tilt
// the body to the side against the load.
import type { Exercise } from "../exercise.ts";
import { farmersCarry, wide } from "./farmers-carry.ts";

export const FARMERS_CARRY_BARBELL_SINGLE_ARM: Exercise = wide(
  farmersCarry({
    key: "farmers-carry-barbell-single-arm",
    title: "Farmers Carry einarmig (Langhantel)",
    equipment: { kind: "carrybars", hand: 0 },
    grip: 23,
  }),
);
