// Deadlift.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import type { Pose } from "../skeleton.ts";

// The bar is over the foot: the foot goes from x = 71 to x = 89. At 84 the bar is in front of the shins and the
// thighs on the whole way (before 2026-11-22 it was at 82, and the bar was up to 4.3 deep in the legs).
const BAR = 84;
const GRIP = 17;
// The length of a straight arm in the side view: 61.9 in space, and the hand is 4 units outside the shoulder joint.
const ARM = Math.sqrt(61.9 ** 2 - (GRIP - 13) ** 2);

const base = { feet: { x: 74, y: 200 }, stance: 9, knees: 0.25, grip: GRIP };

/** A pose with straight arms and the bar at the height `barY`. The shoulders are `ahead` units in front of the bar. */
function onBar(barY: number, ahead: number, lean: number, head: number): Pose {
  const shoulder = { x: BAR + ahead, y: barY - Math.sqrt(ARM ** 2 - ahead ** 2) };
  const torso = shoulderOf({ x: 0, y: 0 }, lean);
  return {
    ...base,
    hip: { x: shoulder.x - torso.x, y: shoulder.y - torso.y },
    lean,
    head,
    hands: { x: BAR, y: barY },
  };
}

// The bar is on the floor. The shoulders are a little in front of the bar, the back is flat.
const START = onBar(189, 5, 60, -25);
// The bar is at the middle of the shins. The legs push: the knees go back and make room for the bar.
const SHIN = onBar(173, 4, 61, -25);
// The bar is just above the knees. The back has nearly the same angle as at the start.
// The knee stays bent here (143 degrees) and is 8 behind the bar. A first correction on 2026-11-22 made the leg
// nearly straight at this pose: the knee then went 9 back and came forward again, and the user saw the thigh jump.
const KNEE = onBar(156, 2.5, 45, -20);
// The bar is at the thighs. The hips go forward, the torso comes up. The knees are nearly straight.
const THIGH = onBar(143, 2, 24, -8);
// The figure stands tall. The shoulders are behind the bar.
const TOP = onBar(135.6, -8.5, 0, 0);
// On the way down, the hips go back first. The knees are nearly straight until the bar has passed them.
const HINGE = onBar(146.5, 4, 34, -12);

export const DEADLIFT: Exercise = {
  key: "deadlift",
  title: "Deadlift",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: START,
  steps: [
    { to: START, seconds: 0.35, label: "Start" },
    { to: SHIN, seconds: 0.4, label: "Zug", ease: "in", anchor: "feet" },
    { to: KNEE, seconds: 0.17, ease: "linear", anchor: "feet" },
    { to: THIGH, seconds: 0.22, ease: "linear", anchor: "feet" },
    { to: TOP, seconds: 0.28, ease: "out", anchor: "feet" },
    { to: TOP, seconds: 0.4, label: "Stand" },
    { to: HINGE, seconds: 0.45, label: "Ablassen", ease: "in", anchor: "feet" },
    { to: KNEE, seconds: 0.15, ease: "linear", anchor: "feet" },
    { to: SHIN, seconds: 0.18, ease: "linear", anchor: "feet" },
    { to: START, seconds: 0.45, ease: "out", anchor: "feet" },
    { to: START, seconds: 0.2, label: "Start" },
  ],
};
