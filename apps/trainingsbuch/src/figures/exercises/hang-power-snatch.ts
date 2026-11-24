// Hang Power Snatch: the power snatch from the hang. The bar starts above the knees, at the middle of the
// thighs, and it does not touch the floor. After the stand, the bar comes down to the hips and back into the hang.
import type { Exercise } from "../exercise.ts";
import { POWER_SNATCH } from "./power-snatch.ts";
import { EXTEND, POWER, pulled } from "./snatch.ts";

// The hang: the knees are a little bent, the hips are back, the chest is in front of the bar. The torso leans about
// 40 degrees, and the bar is above the knees. The wide grip of the snatch: the bar is higher on the thighs than in
// the hang clean.
const HANG = { ...pulled(60, 40, { x: 85.5, y: 150 }), head: -22 };
// On the way back to the hang: the hips go back, the bar slides down the thighs.
const HINGE = { ...pulled(64, 22, { x: 85, y: 140 }), head: -12 };

export const HANG_POWER_SNATCH: Exercise = {
  ...POWER_SNATCH,
  key: "hang-power-snatch",
  title: "Hang Power Snatch",
  start: HANG,
  steps: [
    { to: HANG, seconds: 0.25, label: "Hang" },
    // The jump: from the hang through the bar at the top of the thighs to the full extension. "fk": the arms are ropes.
    {
      to: EXTEND,
      via: [POWER],
      seconds: 0.3,
      label: ["Sprung", "Streckung"],
      ease: "in",
      anchor: "feet",
      arms: "fk",
    },
    // The pull under, the catch above parallel, the stand, the hold and the way down to the hips: as in the power snatch.
    ...POWER_SNATCH.steps.slice(2, 8),
    {
      to: HANG,
      via: [HINGE],
      seconds: 0.4,
      label: "Hang",
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
  ],
};
