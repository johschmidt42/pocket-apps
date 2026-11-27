// Ring Handstand Push-up (Garrett, Meadows): the free handstand push-up of
// `freestanding-handstand-push-up.ts` on two rings that hang low. The hands hold the rings 25 above the floor, and the
// head goes down between the rings to the floor: deeper than the hands. The straps hang straight beside the body.
import type { Exercise } from "../exercise.ts";
import { RINGS } from "../machines.ts";
import { GROUND } from "../skeleton.ts";
import { freeHandstandPushUp } from "./freestanding-handstand-push-up.ts";

const HANDS = { x: 98, y: GROUND - 25 };

export const RING_HANDSTAND_PUSH_UP: Exercise = freeHandstandPushUp({
  key: "ring-handstand-push-up",
  title: "Ring Handstand Push-up",
  equipment: { kind: "rings", ...HANDS },
  // The hands are under the straps. The elbows stay nearer to the body than on the floor: the rings are not stable.
  setup: { hands: HANDS, grip: RINGS.half, elbowsOut: 0.6 },
  box: [30, -45, 120, 257],
});
