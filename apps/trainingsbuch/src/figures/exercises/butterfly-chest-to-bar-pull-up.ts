// Butterfly chest-to-bar pull-up: a variant of `butterfly-pull-up.ts`. The only difference is the swing: it
// goes higher, 62 instead of 46 degrees behind the bar. The pull after it is the same as in the pull-up (the same
// way forward and up), so it ends higher. The high point is behind the bar. From there the body goes forward and down,
// and on the way down the chest touches the bar below the collarbones. Then the body slides down along the bar and goes
// forward under it: the chest does not go into the bar.
import type { Exercise } from "../exercise.ts";
import { butterflyPullUp } from "./butterfly-pull-up.ts";

export const BUTTERFLY_CHEST_TO_BAR_PULL_UP: Exercise = butterflyPullUp({
  key: "butterfly-chest-to-bar-pull-up",
  title: "Butterfly Chest-to-bar Pull-up",
  top: [
    // The kick and the swing, with straight arms: higher than in the pull-up. The legs are 45 degrees in front of the
    // line of the torso, as there.
    {
      at: 0.472,
      ahead: -30,
      below: 54,
      lean: -14,
      bend: 6,
      head: 2,
      thigh: 45,
      knee: 18,
      elbowsOut: 0.45,
    },
    {
      at: 0.577,
      ahead: -54.6,
      below: 29,
      lean: -24,
      bend: 9,
      head: 4,
      thigh: 69,
      knee: 14,
      elbowsOut: 0.5,
    },
    // The pull: the same way as in the pull-up.
    {
      at: 0.789,
      ahead: -36.3,
      below: 10.5,
      lean: -26,
      bend: -2,
      head: 9,
      thigh: 16,
      knee: 13,
      elbowsOut: 0.9,
    },
    // The high point: behind the bar, the shoulders a little above it.
    {
      at: 0.9,
      ahead: -27,
      below: -1.5,
      lean: -27,
      bend: -8,
      head: 11,
      thigh: 2,
      knee: 16,
      elbowsOut: 1.05,
    },
    // On the way down: the chest touches the bar, the body in the arch.
    {
      at: 0.97,
      ahead: -14.5,
      below: 2,
      lean: -29,
      bend: -12,
      head: 12,
      thigh: -5,
      knee: 20,
      elbowsOut: 1.1,
    },
    // Down along the bar, then forward under it.
    {
      at: 0.03,
      ahead: -13.8,
      below: 8,
      lean: -26,
      bend: -15,
      head: 10,
      thigh: -14,
      knee: 24,
      elbowsOut: 1.05,
    },
    {
      at: 0.07,
      ahead: -10,
      below: 20,
      lean: -19,
      bend: -20,
      head: 6,
      thigh: -32,
      knee: 27,
      elbowsOut: 0.95,
    },
  ],
  end: [
    [0.84, "Zug"],
    [0.94, "Höhepunkt"],
    [1, "Brust an der Stange"],
  ],
});
