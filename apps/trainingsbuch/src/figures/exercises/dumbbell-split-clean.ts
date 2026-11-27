// Dumbbell Split Clean (Erin: "15 dumbbell split cleans", two dumbbells): the dumbbell clean of
// `dumbbell-squat-clean.ts` from the floor, but the feet jump into a split for the catch: one foot forward, the other
// back on its toes, as in the split jerk. Then the feet come together, and the dumbbells go back to the floor.
import type { Exercise } from "../exercise.ts";
import { tiptoe, type Pose } from "../skeleton.ts";
import { dumbbellClean } from "./dumbbell-squat-clean.ts";
import { rack } from "./dumbbell-thruster.ts";

const BACK_TOES = 150;
// The back foot is 1 above the floor: on the way into the split, the foot turns, and its toe dips a little.
const SPLIT: Pick<Pose, "feet" | "toes"> = {
  feet: [
    { x: 100, y: 200 },
    { x: 45, y: tiptoe(45, BACK_TOES).y - 1 },
  ],
  toes: [90, BACK_TOES],
};

export const DUMBBELL_SPLIT_CLEAN: Exercise = dumbbellClean({
  key: "dumbbell-split-clean",
  title: "Dumbbell Split Clean",
  from: "floor",
  // The front thigh is a little above level, the back knee is low.
  catch: rack(72, 146, 4, -6),
  land: { x: 72, y: 136, lean: 6 },
  sink: 0.2,
  stand: 0.5,
  split: SPLIT,
});
