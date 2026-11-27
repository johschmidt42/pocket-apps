// Burpee Chest-to-bar Pull-up (The Lyon): the burpee pull-up of `burpee-pull-up.ts`, but the chest touches
// the bar at the top. The top is that of the strict chest-to-bar pull-up.
import type { Exercise } from "../exercise.ts";
import { burpeePullUp } from "./burpee-pull-up.ts";
import { CHEST_TO_BAR } from "./chest-to-bar-pull-up.ts";

export const BURPEE_CHEST_TO_BAR_PULL_UP: Exercise = burpeePullUp({
  key: "burpee-chest-to-bar-pull-up",
  title: "Burpee Chest-to-bar Pull-up",
  top: CHEST_TO_BAR,
  label: "Brust an der Stange",
});
