// Power Clean: the clean of `power-clean-and-jerk.ts` without the jerk. From the stand, the bar goes back to the floor.
// In the clean and jerk, the feet land wider and stay there for the jerk. Here they keep the stance of the pull:
// the way back to the floor starts in that stance, and planted feet cannot change it without a slide.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { item, type Pose, type Step } from "../skeleton.ts";
import { LOWER, SETUP } from "./clean-and-jerk.ts";
import { POWER_CLEAN_STEPS } from "./power-clean-and-jerk.ts";

const inStance = (pose: Pose): Pose => ({ ...pose, stance: 10 });
const inStanceStep = (step: Step): Step => ({
  ...step,
  to: inStance(step.to),
  ...(step.via === undefined ? {} : { via: step.via.map(inStance) }),
});

export const POWER_CLEAN: Exercise = {
  key: "power-clean",
  title: "Power Clean",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: SETUP,
  steps: [
    ...POWER_CLEAN_STEPS.map(inStanceStep),
    { ...item(LOWER, 0), label: "Ablassen" },
    ...LOWER.slice(1),
  ],
};
