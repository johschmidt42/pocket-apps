// Overhead Lunge with a barbell with a wide grip.
import type { Exercise } from "../exercise.ts";
import { bothHands, OVERHEAD_VIEWS } from "./overhead-lunge.ts";
import { lunge } from "./walking-lunge.ts";

export const OVERHEAD_LUNGE_BARBELL: Exercise = lunge({
  key: "overhead-lunge-barbell",
  title: "Overhead Lunge (Langhantel)",
  equipment: { kind: "barbell" },
  upper: bothHands(30),
  views: OVERHEAD_VIEWS,
});
