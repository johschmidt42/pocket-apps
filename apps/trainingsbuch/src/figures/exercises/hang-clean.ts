// Hang Clean: the squat clean from the hang ("hang squat clean"). The bar starts above the knees, at the
// middle of the thighs, and it does not touch the floor. The athlete receives the bar in a full front squat. After the
// stand, the bar goes down to the hips and back into the hang. Built like `hang-power-clean.ts`.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { item } from "../skeleton.ts";
import { HINGE, LOWER, POWER, pulled, THIGH } from "./clean-and-jerk.ts";
import { SQUAT_CLEAN } from "./squat-clean.ts";

// The hang of the hang power clean: the torso leans about 45 degrees, and the bar is above the knees.
const HANG = pulled(56.5, 42, { x: 85.5, y: 155 }, -22);

export const HANG_CLEAN: Exercise = {
  key: "hang-clean",
  title: "Hang Clean",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: HANG,
  steps: [
    { to: HANG, seconds: 0.2, label: "Hang" },
    // The jump: the bar gets faster and faster. "fk": the arms are ropes.
    {
      to: POWER,
      via: [THIGH],
      seconds: 0.22,
      label: "Sprung",
      ease: "in",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    // The extension, the turnover, the catch in the deep squat and the stand are those of the squat clean.
    ...SQUAT_CLEAN.steps.slice(1, 7),
    { ...item(LOWER, 0), label: "Ablassen" },
    {
      to: HANG,
      via: [HINGE],
      seconds: 0.36,
      label: "Hang",
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
  ],
};
