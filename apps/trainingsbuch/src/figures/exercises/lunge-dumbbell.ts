// Lunge with one dumbbell (Swift 1-1: "hold the dumbbell in any position"). The dumbbell hangs in the
// near hand, the far arm swings a little. The legs are `walking-lunge.ts`.
import type { Exercise } from "../exercise.ts";
import { oneDumbbellAtSide } from "./lunge-dumbbells.ts";
import { lunge } from "./walking-lunge.ts";

export const LUNGE_DUMBBELL: Exercise = lunge({
  key: "lunge-dumbbell",
  title: "Lunge (eine Kurzhantel)",
  equipment: { kind: "dumbbells", hand: 0 },
  upper: oneDumbbellAtSide,
});
