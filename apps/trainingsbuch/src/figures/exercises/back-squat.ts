// Back Squat (high bar): the bar lies on the upper back, the hips go below the knees.
// The bar stays near the middle of the foot: the torso leans more than in the front squat.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import type { Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
// The hands are just outside the shoulders. With a wider grip, elbows that point out also point to the front.
const base = { feet: { x: 74, y: 200 }, stance: 12, knees: 0.45, grip: 19 };
/** How far the bar is behind the line of the torso, and how far above the neck base along it. */
const BEHIND = 10.5;
const ABOVE = 1;

/** A pose from the height of the hip, the lean and the x of the bar. The hands hold the bar on the upper back. */
function pose(hipY: number, lean: number, barX: number): Pose {
  const sin = Math.sin(lean * RAD);
  const cos = Math.cos(lean * RAD);
  const shoulder = shoulderOf({ x: 0, y: hipY }, lean);
  const hip = { x: barX - shoulder.x + BEHIND * cos - ABOVE * sin, y: hipY };
  const neck = shoulderOf(hip, lean);
  return {
    ...base,
    hip,
    lean,
    head: -Math.min(lean * 0.7, 24),
    hands: { x: neck.x + ABOVE * sin - BEHIND * cos, y: neck.y - ABOVE * cos - BEHIND * sin },
    // The elbows point down along the torso, also when it leans, and a little out. Much more `elbowsOut` turns
    // them to the front of the chest, because the hands are behind the shoulders and outside them.
    elbowTo: -lean - 20,
    elbowsOut: 0.65,
  };
}

const STAND_Y = 200 - Math.sqrt(79.98 ** 2 - 5 ** 2 - 2.6 ** 2);
const STAND = pose(STAND_Y, 6, 71);
const HIGH = pose(135, 15, 72.5);
const LOW = pose(155, 29, 74);
const BOTTOM = pose(172, 38, 75.5);

const VIEWS: Exercise["views"] = [
  { ...SIDE, box: [14, 22, 120, 190] },
  { ...FRONT, box: [-60, 22, 120, 190] },
];

export const BACK_SQUAT: Exercise = {
  key: "back-squat",
  title: "Back Squat",
  equipment: { kind: "barbell", onBack: true },
  views: VIEWS,
  start: STAND,
  steps: [
    {
      to: BOTTOM,
      via: [HIGH, LOW],
      seconds: 1.1,
      label: "Runter",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: BOTTOM, seconds: 0.12, label: "Unten" },
    {
      to: STAND,
      via: [LOW, HIGH],
      seconds: 0.9,
      label: "Hoch",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: STAND, seconds: 0.5, label: "Stehen" },
  ],
};
