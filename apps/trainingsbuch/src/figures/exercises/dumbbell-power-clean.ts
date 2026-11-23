// Dumbbell Power Clean: the clean of `dumbbell-squat-clean.ts` with a catch in a partial squat.
import type { Exercise } from "../exercise.ts";
import { dumbbellClean } from "./dumbbell-squat-clean.ts";
import { rack } from "./dumbbell-thruster.ts";

export const DUMBBELL_POWER_CLEAN: Exercise = dumbbellClean({
  key: "dumbbell-power-clean",
  title: "Dumbbell Power Clean",
  from: "floor",
  // The thighs are clearly above level.
  catch: rack(68, 133, 9, -4),
  land: { x: 70.2, y: 128.6, lean: 6.5 },
  sink: 0.13,
  stand: 0.35,
});
