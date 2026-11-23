// Farmers carry with two kettlebells: the same walk as `farmers-carry.ts`.
// The hands are 3 farther out: a bell is wider than the handle of a dumbbell, and it hangs beside the knee.
import type { Exercise } from "../exercise.ts";
import { farmersCarry } from "./farmers-carry.ts";

export const FARMERS_CARRY_KETTLEBELL: Exercise = farmersCarry({
  key: "farmers-carry-kettlebell",
  title: "Farmers Carry (Kettlebell)",
  equipment: { kind: "kettlebells" },
  grip: 26,
});
