// Squat Clean Thruster (Foo): the squat clean of `clean-and-jerk.ts` from the floor into the deep catch, and
// from there the thruster: up and overhead in one motion, as in `thruster.ts`. Then the bar goes back to the floor.
// Each repetition starts on the floor.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { item } from "../skeleton.ts";
import { LOWER, OVERHEAD, PASS, RACK, SETUP, SQUAT_CLEAN_STEPS } from "./clean-and-jerk.ts";

/** The clean up to the hold in the catch. The stand of the squat clean is the drive of the thruster here. */
const TO_CATCH = SQUAT_CLEAN_STEPS.filter((step) => step.to !== RACK);

export const SQUAT_CLEAN_THRUSTER: Exercise = {
  key: "squat-clean-thruster",
  title: "Squat Clean Thruster",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: SETUP,
  steps: [
    ...TO_CATCH,
    { to: RACK, seconds: 0.42, label: "Aufstehen", ease: "in", anchor: "feet", arms: "carry" },
    {
      to: OVERHEAD,
      via: [PASS],
      seconds: 0.3,
      label: "Drücken",
      ease: "out",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: OVERHEAD, seconds: 0.3, label: "Halten" },
    {
      to: RACK,
      via: [PASS],
      seconds: 0.45,
      label: "Ablassen",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: RACK, seconds: 0.15 },
    { ...item(LOWER, 0), label: "Zum Boden" },
    ...LOWER.slice(1),
  ],
};
