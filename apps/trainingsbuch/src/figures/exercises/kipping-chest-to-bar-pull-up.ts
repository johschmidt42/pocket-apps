// Kipping chest-to-bar pull-up: a variant of `kipping-pull-up.ts`. The same kip, with a higher top.
import type { Exercise } from "../exercise.ts";
import { kippingPullUp } from "./kipping-pull-up.ts";

export const KIPPING_CHEST_TO_BAR_PULL_UP: Exercise = kippingPullUp({
  key: "kipping-chest-to-bar-pull-up",
  title: "Kipping Chest-to-bar Pull-up",
  // The chest touches the bar below the collarbones. The shoulder joints are 14.5 behind the bar and 1 above it
  // (`swing` above 90), the torso leans back 28 degrees, and the hips are high: the legs are far in front.
  top: {
    swing: 94,
    reach: 14.5,
    lean: -28,
    bend: -4,
    legs: 38,
    head: 12,
    elbows: 0,
    elbowsOut: 1.1,
  },
  label: "Brust an der Stange",
});
