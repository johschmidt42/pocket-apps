// Run with an empty barbell (Dae Han): the run, with the bar on the upper back as in the back squat. The
// hands hold it just outside the shoulders, the elbows point down. The arms do not swing.
import { inFront, loadedRun } from "./run.ts";

export const RUN_BARBELL = loadedRun(
  "run-barbell",
  "Run with a Barbell",
  { kind: "barbell", onBack: true, empty: true },
  (hip, lean) => ({
    // The bar of the back squat: 1 above the base of the neck and 10.5 behind the line of the torso.
    hands: inFront(hip, lean, -1, -10.5),
    grip: 19,
    elbowTo: -lean - 20,
    elbowsOut: 0.65,
  }),
);
