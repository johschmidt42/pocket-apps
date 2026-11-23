// Burpee over the Bar: CrossFit does not require a lateral burpee. The athlete may face the bar in the burpee
// and in the jump. So this is the motion of the bar-facing burpee, which the side view shows clearly.
import type { Exercise } from "../exercise.ts";
import { BAR_FACING_BURPEE } from "./bar-facing-burpee.ts";

export const BURPEE_OVER_BAR: Exercise = {
  ...BAR_FACING_BURPEE,
  key: "burpee-over-bar",
  title: "Burpee over the Bar",
};
