// Burpee over the Rower (Laura: "20 burpees over the rower"): the motion of the burpee over the bar
// (`burpee-over-bar.ts`), over the rail of a rower that crosses the way. The side view sees the end of the rail: its
// top is 34 above the floor, higher than a bar.
import type { Exercise } from "../exercise.ts";
import { BURPEE_OVER_BAR } from "./burpee-over-bar.ts";

export const BURPEE_OVER_ROWER: Exercise = {
  ...BURPEE_OVER_BAR,
  key: "burpee-over-rower",
  title: "Burpee over the Rower",
  equipment:
    BURPEE_OVER_BAR.equipment.kind === "floorbar"
      ? { ...BURPEE_OVER_BAR.equipment, item: "rower" }
      : BURPEE_OVER_BAR.equipment,
};
