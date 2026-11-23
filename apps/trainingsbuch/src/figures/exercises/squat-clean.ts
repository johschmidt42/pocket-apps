// Squat Clean: the clean of `clean-and-jerk.ts` without the jerk. From the stand, the bar goes back to the floor.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { item } from "../skeleton.ts";
import { LOWER, SETUP, SQUAT_CLEAN_STEPS } from "./clean-and-jerk.ts";

export const SQUAT_CLEAN: Exercise = {
  key: "squat-clean",
  title: "Squat Clean",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: SETUP,
  steps: [...SQUAT_CLEAN_STEPS, { ...item(LOWER, 0), label: "Ablassen" }, ...LOWER.slice(1)],
};
