// Sandbag Carry (Collin, Servais: "400 m sandbag carry"): the walk of `farmers-carry.ts` with a sandbag in a
// bear hug. The bag lies across the chest, the arms go around it, the hands hold it from below. The torso leans back a
// little against the load. The workouts do not say how to hold the bag: in front is the usual hold, and the athlete can
// also put it on a shoulder.
import type { Exercise } from "../exercise.ts";
import { farmersCarry } from "./farmers-carry.ts";
import { inFront } from "./run.ts";

export const SANDBAG_CARRY: Exercise = farmersCarry({
  key: "sandbag-carry",
  title: "Sandbag Carry",
  equipment: { kind: "sandbag" },
  grip: 8,
  // The hands are under the front of the bag, 30 below the base of the neck and 26 in front of the torso.
  upper: (_part, hip, lean) => ({
    lean: lean - 4,
    hands: inFront(hip, lean - 4, 30, 26),
    grip: 8,
    shrug: 0,
    head: 2,
    elbowTo: 20,
    elbowsOut: 1.6,
  }),
});
