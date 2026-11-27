// Barbell Step-up (Monti: "barbell step-ups", Northrup: "barbell back-rack step-ups"): the box step-up of
// `step-up.ts` with the bar on the upper back, as in the back squat and the run with a barbell. Monti does not say
// where the bar is. The back rack is the usual hold, and Northrup names it.
import type { Exercise } from "../exercise.ts";
import { inFront } from "./run.ts";
import { stepUp } from "./step-up.ts";

export const STEP_UP_BARBELL: Exercise = stepUp({
  key: "step-up-barbell",
  title: "Box Step-up (Langhantel)",
  load: { kind: "barbell", onBack: true },
  // The bar of the back squat: 1 above the base of the neck and 10.5 behind the line of the torso.
  map: (pose) => ({
    ...pose,
    hands: inFront(pose.hip, pose.lean, -1, -10.5),
    grip: 19,
    elbows: 0,
    elbowTo: -pose.lean - 20,
    elbowsOut: 0.65,
  }),
});
