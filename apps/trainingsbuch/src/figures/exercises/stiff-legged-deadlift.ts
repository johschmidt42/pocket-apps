// Stiff-legged Deadlift (Stephen): a deadlift from the floor with nearly straight legs. Each repetition
// starts with the bar on the floor and ends there. Only the hips open and close: the back is flat and nearly level at
// the bottom, the knees bend only a little (the legs are 78 to 79.3 of 80 long). This is the difference to the
// Romanian deadlift, which starts in the stand and stops at the shins (BarBend, PowerliftingTechnique). The bar stays
// over the middle of the foot, as in the deadlift.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import type { Pose } from "../skeleton.ts";

const BAR = 84;
const GRIP = 17;
/** The length of a straight arm in the side view, as in the deadlift. */
const ARM = Math.sqrt(61.9 ** 2 - (GRIP - 13) ** 2);
const ANKLE = { x: 74, y: 200 };
const STANCE = 9;
/** Nearly straight legs: a soft knee. At the floor, the knees give a little more. */
const LEG = 79.3;
const FLOOR_LEG = 78;

const base = { feet: ANKLE, stance: STANCE, knees: 0.25, grip: GRIP };

/**
 * A pose with nearly straight legs and straight arms. The torso leans `lean` degrees, the shoulders are `ahead` units
 * in front of the bar. The leg length sets the height of the hip, and the hip sets the height of the bar.
 */
function hinge(lean: number, ahead: number, head: number, leg = LEG): Pose {
  const torso = shoulderOf({ x: 0, y: 0 }, lean);
  const hipX = BAR + ahead - torso.x;
  const hipY = ANKLE.y - Math.sqrt(leg ** 2 - (hipX - ANKLE.x) ** 2 - (STANCE - 7) ** 2);
  const shoulder = { x: hipX + torso.x, y: hipY + torso.y };
  return {
    ...base,
    hip: { x: hipX, y: hipY },
    lean,
    head,
    hands: { x: BAR, y: shoulder.y + Math.sqrt(ARM ** 2 - ahead ** 2) },
  };
}

/** The stand: the shoulders are a little behind the bar, the hips are open. */
const TOP = hinge(0, -10, 0);
const HIGH = hinge(28, 0, -8);
const MIDDLE = hinge(55, 4, -18, 78.8);
/** The bar on the floor (its center 11 above the ground: the plates touch it). The back is nearly level. */
const FLOOR = hinge(88, 4, -30, FLOOR_LEG);

export const STIFF_LEGGED_DEADLIFT: Exercise = {
  key: "stiff-legged-deadlift",
  title: "Stiff-legged Deadlift",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: FLOOR,
  steps: [
    { to: FLOOR, seconds: 0.3, label: "Start" },
    { to: TOP, via: [MIDDLE, HIGH], seconds: 0.9, label: "Zug", ease: "soft", anchor: "feet" },
    { to: TOP, seconds: 0.35, label: "Stand" },
    {
      to: FLOOR,
      via: [HIGH, MIDDLE],
      seconds: 0.95,
      label: "Ablassen",
      ease: "soft",
      anchor: "feet",
    },
  ],
};
