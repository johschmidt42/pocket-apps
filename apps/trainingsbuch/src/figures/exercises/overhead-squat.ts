// Overhead Squat: the bar stays on locked arms over the middle of the feet, the hips go below the knees.
// The grip, the active shoulders and the way of the hip come from the overhead squat of `snatch.ts`.
// The bar is a little behind the head (the user saw it, 2026-11-23): the head goes forward between the arms, and
// the bar stays over the middle of the feet for the balance.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import type { Pose } from "../skeleton.ts";
import { locked, overhead, TALL } from "./snatch.ts";

/** The hip of the deep squat. The hip joint is below the knee joint. */
const DEEP = 174;
/** The active shoulders under the bar. */
const SHRUG = 3;

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A pose on the way: 0 is the stand, 1 is the deep squat. */
function at(part: number): Pose {
  const base = locked(mix(TALL, DEEP, part));
  // In the stand, the body is 2 farther forward over the feet. The hip is a very little lower, so that the legs reach.
  const hip = { x: base.hip.x + mix(2, 0, part), y: base.hip.y + mix(0.08, 0, part) };
  const lean = base.lean + mix(3, 0, part);
  return {
    ...base,
    hip,
    lean,
    head: mix(10, -16, part),
    hands: overhead(hip, lean, mix(-2, -3, part), SHRUG),
  };
}

const STAND = at(0);
const BOTTOM = at(1);

export const OVERHEAD_SQUAT: Exercise = {
  key: "overhead-squat",
  title: "Overhead Squat",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: STAND,
  steps: [
    {
      to: BOTTOM,
      via: [at(0.18), at(0.5)],
      seconds: 1.2,
      label: "Runter",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: BOTTOM, seconds: 0.15, label: "Unten" },
    {
      to: STAND,
      via: [at(0.5), at(0.18)],
      seconds: 1,
      label: "Hoch",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: STAND, seconds: 0.5, label: "Stehen" },
  ],
};
