// Burpee over the Backpack (Gale Force: "23 burpees over the backpack"): the motion of the burpee over the
// bar (`burpee-over-bar.ts`), with the loaded backpack of the workout on the floor instead of the bar. The workout does
// not ask for a lateral jump: the figure faces the backpack, as over the bar.
import type { Exercise } from "../exercise.ts";
import { BURPEE_OVER_BAR } from "./burpee-over-bar.ts";

export const BURPEE_OVER_BACKPACK: Exercise = {
  ...BURPEE_OVER_BAR,
  key: "burpee-over-backpack",
  title: "Burpee over the Backpack",
  equipment:
    BURPEE_OVER_BAR.equipment.kind === "floorbar"
      ? { ...BURPEE_OVER_BAR.equipment, item: "backpack" }
      : BURPEE_OVER_BAR.equipment,
};
