// Box Jump-over (CrossFit Open 22.1, 26.1): from the stand before the box, a jump with both feet onto the
// box, a jump down on the far side, and a turn to face the box again. The jump onto the box and over it are those of
// the burpee box jump-over, without the burpee. A two-foot takeoff, and only the feet touch the box.
import type { Exercise } from "../exercise.ts";
import { at, BURPEE_BOX_JUMP_OVER, NEAR, RISE, STAND } from "./burpee-box-jump-over.ts";

// The dip before the jump: the hips go back and down, the arms swing back.
const DIP = at({ x: NEAR - 4, y: 142 }, 34, -6, 56, {
  head: -14,
  feet: { x: NEAR, y: 200 },
  knees: 0.3,
});

/** The steps of the burpee box jump-over before its jump: the burpee and the rise from the floor. */
const BURPEE = 12;

export const BOX_JUMP_OVER: Exercise = {
  ...BURPEE_BOX_JUMP_OVER,
  key: "box-jump-over",
  title: "Box Jump-over",
  start: STAND,
  steps: [
    { to: STAND, seconds: 0.25, label: "Stehen" },
    { to: DIP, seconds: 0.35, label: "Ausholen", ease: "soft", anchor: "feet" },
    { to: RISE, seconds: 0.3, label: "Sprung", ease: "in", anchor: "feet" },
    ...BURPEE_BOX_JUMP_OVER.steps.slice(BURPEE),
  ],
};
