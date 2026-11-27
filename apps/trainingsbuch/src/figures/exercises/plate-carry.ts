// Plate Carry (Muller: "710 m plate carry", 20/11 kg): the walk of `farmers-carry.ts` with a plate held in
// front of the chest, as in the run with a plate. The hands hold its rim at the sides, the elbows point down. The
// workout does not say how to hold the plate: in front of the chest is the usual hold for a long way.
import type { Exercise } from "../exercise.ts";
import { farmersCarry } from "./farmers-carry.ts";
import { inFront } from "./run.ts";

export const PLATE_CARRY: Exercise = farmersCarry({
  key: "plate-carry",
  title: "Plate Carry",
  equipment: { kind: "plate" },
  grip: 20,
  // The center of the plate (radius 20) is 16 below the base of the neck and 13 in front of the line of the torso.
  upper: (_part, hip, lean) => ({
    hands: inFront(hip, lean, 16, 13),
    grip: 20,
    shrug: 0,
    elbowTo: 0,
    elbowsOut: 0.6,
  }),
});
