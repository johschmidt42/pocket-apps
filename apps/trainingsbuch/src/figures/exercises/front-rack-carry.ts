// Front-rack Carry with two kettlebells (Daniel Ray: "double-kettlebell front-rack carry"): the walk of
// `farmers-carry.ts`, with each bell in the rack on the back of the forearm beside the shoulder, as in the front-rack
// lunge. The arms do not swing.
import type { Exercise } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { farmersCarry } from "./farmers-carry.ts";

/** The grip of the kettlebell thruster: with 16, the bells are in the upper arms. */
const GRIP = 20;

export const FRONT_RACK_CARRY: Exercise = farmersCarry({
  key: "front-rack-carry",
  title: "Front-rack Carry (Kettlebells)",
  equipment: { kind: "kettlebells" },
  grip: GRIP,
  upper: (_part, hip, lean) => ({
    hands: handAt(hip, lean, 3, -9),
    grip: GRIP,
    shrug: 0,
    elbowTo: 80,
    elbowsOut: 0.4,
  }),
});
