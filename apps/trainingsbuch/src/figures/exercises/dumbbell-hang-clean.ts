// Dumbbell Hang Squat Clean: the clean of `dumbbell-squat-clean.ts` from the hang. The dumbbells never
// touch the floor.
import type { Exercise } from "../exercise.ts";
import { dumbbellClean } from "./dumbbell-squat-clean.ts";
import { BOTTOM } from "./dumbbell-thruster.ts";

export const DUMBBELL_HANG_CLEAN: Exercise = dumbbellClean({
  key: "dumbbell-hang-clean",
  title: "Dumbbell Hang Squat Clean",
  from: "hang",
  catch: BOTTOM,
  land: { x: 62, y: 146, lean: 17 },
  sink: 0.2,
  stand: 0.6,
});
