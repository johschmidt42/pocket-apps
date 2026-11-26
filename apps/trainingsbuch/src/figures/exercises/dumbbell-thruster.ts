// Dumbbell Thruster: two dumbbells on the shoulders, a front squat below parallel, and from the drive of the
// legs one press to locked arms overhead. The dumbbells are beside the head on the way up.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import { up, type Pose } from "../skeleton.ts";

const GRIP = 20;
const SHRUG = 3;
/** A straight arm in the side view: the hand is `GRIP - 13` out to the side of the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - (GRIP - 13) ** 2);
const base = { feet: { x: 74, y: 200 }, stance: 11, knees: 0.5, grip: GRIP };

/** The dumbbells on the shoulders. The upper arm points forward, about 65 degrees up from straight down, as in the front squat. */
export function rack(x: number, y: number, lean: number, head: number): Pose {
  const hip = { x, y };
  return { ...base, hip, lean, head, hands: handAt(hip, lean, 3, -9), elbowTo: 80, elbowsOut: 0.4 };
}

/** Locked arms overhead, the hands over the shoulders. */
export function locked(x: number, y: number, lean: number): Pose {
  const hip = { x, y };
  const neck = shoulderOf(hip, lean);
  const along = up(lean);
  const joint = { x: neck.x + along.x * SHRUG, y: neck.y + along.y * SHRUG };
  return {
    ...base,
    hip,
    lean,
    head: 4,
    hands: { x: joint.x + 1, y: joint.y - Math.sqrt(REACH ** 2 - 1) },
    shrug: SHRUG,
    elbowTo: 60,
    elbowsOut: 2,
  };
}

export const RACK = rack(74, 120.1, 2, 0);
export const HIGH = rack(68, 134, 10, -4);
export const LOW = rack(59, 154, 21, -10);
// Below parallel: the hip is lower than the knee.
export const BOTTOM = rack(55, 169, 27, -14);
// The bar of the legs is nearly done, and the arms start to press.
export const DRIVE: Pose = {
  ...base,
  hip: { x: 73, y: 122 },
  lean: 3,
  head: -2,
  hands: handAt({ x: 73, y: 122 }, 3, 5, -18),
  elbowTo: 75,
  elbowsOut: 0.5,
};
export const PRESS: Pose = {
  ...base,
  hip: { x: 74, y: 120.1 },
  lean: 0,
  head: 0,
  hands: handAt({ x: 74, y: 120.1 }, 0, 4, -38),
  elbowTo: 65,
  elbowsOut: 1.2,
};
export const TOP = locked(74, 120.1, 0);

export const DUMBBELL_THRUSTER: Exercise = {
  key: "dumbbell-thruster",
  title: "Dumbbell Thruster",
  equipment: { kind: "dumbbells" },
  views: [SIDE, FRONT],
  start: RACK,
  steps: [
    {
      to: BOTTOM,
      via: [HIGH, LOW],
      seconds: 0.8,
      label: "Kniebeuge",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: BOTTOM, seconds: 0.06 },
    {
      to: DRIVE,
      via: [LOW, HIGH],
      seconds: 0.5,
      label: "Aufstehen",
      ease: "in",
      anchor: "feet",
      arms: "carry",
    },
    {
      to: TOP,
      via: [PRESS],
      seconds: 0.3,
      label: "Drücken",
      ease: "out",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: TOP, seconds: 0.3, label: "Halten" },
    {
      to: RACK,
      via: [PRESS],
      seconds: 0.5,
      label: "Ablassen",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: RACK, seconds: 0.12 },
  ],
};
