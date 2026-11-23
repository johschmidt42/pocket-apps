// Overhead Lunge with a plate in both hands, held at its edge.
import type { Exercise } from "../exercise.ts";
import { bothHands, OVERHEAD_VIEWS } from "./overhead-lunge.ts";
import { lunge } from "./walking-lunge.ts";

export const OVERHEAD_LUNGE_PLATE: Exercise = lunge({
  key: "overhead-lunge-plate",
  title: "Overhead Lunge (Hantelscheibe)",
  equipment: { kind: "plate" },
  upper: bothHands(20),
  views: OVERHEAD_VIEWS,
});
