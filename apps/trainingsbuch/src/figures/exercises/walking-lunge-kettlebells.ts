// Walking Lunge with two kettlebells (Strange: "walking lunges with two kettlebells"). The workout does not
// say where the bells are. They hang at the sides, as in the farmers carry: that is the most usual hold. The legs are
// `walking-lunge.ts`, the arms hang still as in the lunge with two dumbbells.
import type { Exercise } from "../exercise.ts";
import { hanging } from "./lunge-dumbbells.ts";
import { lunge, type Upper } from "./walking-lunge.ts";

/** A bell is wider than the handle of a dumbbell: the hands are 3 farther out (as in the farmers carry). */
const GRIP = 26;

const twoKettlebells: Upper = (_part, hip, lean) => {
  const hand = hanging(hip, lean, GRIP);
  return { hands: [hand, hand], grip: GRIP, elbows: -0.2 };
};

export const WALKING_LUNGE_KETTLEBELLS: Exercise = lunge({
  key: "walking-lunge-kettlebells",
  title: "Walking Lunge (zwei Kettlebells)",
  equipment: { kind: "kettlebells" },
  upper: twoKettlebells,
});
