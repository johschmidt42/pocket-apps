// Single-arm Dumbbell Thruster (ODA 7313: "10 left-arm dumbbell thrusters, 10 right-arm"): the single-arm
// kettlebell thruster of `kettlebell-thruster-single-arm.ts` with one dumbbell in the near hand. The free arm is out
// to the side, as a counterweight.
import type { Exercise } from "../exercise.ts";
import { KETTLEBELL_THRUSTER_SINGLE_ARM } from "./kettlebell-thruster-single-arm.ts";

export const DUMBBELL_THRUSTER_SINGLE_ARM: Exercise = {
  ...KETTLEBELL_THRUSTER_SINGLE_ARM,
  key: "dumbbell-thruster-single-arm",
  title: "Dumbbell Thruster einarmig",
  equipment: { kind: "dumbbells", hand: 0 },
};
