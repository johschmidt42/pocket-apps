// Strict chest-to-bar pull-up: a variant of `pull-up.ts`. The same motion, with a higher top.
import type { Exercise } from "../exercise.ts";
import { pullUp } from "./pull-up.ts";

export const CHEST_TO_BAR_PULL_UP: Exercise = pullUp({
  key: "chest-to-bar-pull-up",
  title: "Strict Chest-to-bar Pull-up",
  // The chest touches the bar below the collarbones. The shoulder joints are 14 behind the bar and a little above
  // it, the torso leans back 30 degrees with an arch, and the head is far above the bar.
  top: {
    back: 14.4,
    down: -0.9,
    lean: -30,
    legs: 24,
    head: 14,
    elbows: 0,
    elbowsOut: 1.1,
    bend: -16,
  },
  label: "Brust an der Stange",
});
