// Dumbbell Squat Clean Thruster (Feeks): the dumbbell squat clean of `dumbbell-squat-clean.ts` from the floor
// into the deep catch, and from there the thruster of `dumbbell-thruster.ts`: up and overhead in one motion. Then the
// dumbbells go back to the floor. Each repetition starts on the floor.
import type { Exercise } from "../exercise.ts";
import { dumbbellClean } from "./dumbbell-squat-clean.ts";
import { BOTTOM } from "./dumbbell-thruster.ts";

export const DUMBBELL_SQUAT_CLEAN_THRUSTER: Exercise = dumbbellClean({
  key: "dumbbell-squat-clean-thruster",
  title: "Dumbbell Squat Clean Thruster",
  from: "floor",
  catch: BOTTOM,
  land: { x: 62, y: 146, lean: 17 },
  sink: 0.2,
  stand: 0.5,
  press: true,
});
