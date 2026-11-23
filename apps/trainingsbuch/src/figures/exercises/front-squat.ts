// Front Squat: the bar stays in the front rack, the torso stays upright, the hips go below the knees.
// The stand and the bottom are the rack and the deep catch of `clean-and-jerk.ts`.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import type { Pose } from "../skeleton.ts";
import { CATCH, RACK } from "./clean-and-jerk.ts";

// A pose on the way. The bar is nearly above the middle of the foot: the hip goes back only as far as the lean permits.
function way(hipY: number, lean: number, dx: number, dy: number, elbowTo: number): Pose {
  const barX = 78.5;
  const shoulder = shoulderOf({ x: 0, y: hipY }, lean);
  const hip = { x: barX - dx - shoulder.x, y: hipY };
  return { ...RACK, hip, lean, hands: handAt(hip, lean, dx, dy), elbowTo };
}
const HIGH = way(133, 9, 3.2, -9.9, 80);
const LOW = way(152, 20, 3.7, -10, 80);

const VIEWS: Exercise["views"] = [
  { ...SIDE, box: [14, 22, 120, 190] },
  { ...FRONT, box: [-60, 22, 120, 190] },
];

export const FRONT_SQUAT: Exercise = {
  key: "front-squat",
  title: "Front Squat",
  equipment: { kind: "barbell" },
  views: VIEWS,
  start: RACK,
  steps: [
    {
      to: CATCH,
      via: [HIGH, LOW],
      seconds: 1.1,
      label: "Runter",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: CATCH, seconds: 0.12, label: "Unten" },
    {
      to: RACK,
      via: [LOW, HIGH],
      seconds: 0.9,
      label: "Hoch",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: RACK, seconds: 0.5, label: "Stehen" },
  ],
};
