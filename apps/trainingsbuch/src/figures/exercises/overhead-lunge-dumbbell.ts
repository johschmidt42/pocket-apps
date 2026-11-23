// Overhead Lunge with one dumbbell in the near hand, the far arm hangs.
import type { Exercise } from "../exercise.ts";
import { oneDumbbell, OVERHEAD_VIEWS } from "./overhead-lunge.ts";
import { lunge } from "./walking-lunge.ts";

export const OVERHEAD_LUNGE_DUMBBELL: Exercise = lunge({
  key: "overhead-lunge-dumbbell",
  title: "Overhead Lunge (Kurzhantel)",
  equipment: { kind: "dumbbell", hand: 0 },
  upper: oneDumbbell,
  views: OVERHEAD_VIEWS,
});
