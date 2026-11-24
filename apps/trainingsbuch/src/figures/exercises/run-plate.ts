// Run with a plate (Nutts, Harper, Liam, Pat, Wes, Wyk, Goose): the run, with a plate of 20 kg held in
// front of the chest. The hands hold its rim at the sides, the elbows point down. The arms do not swing.
import { inFront, loadedRun } from "./run.ts";

export const RUN_PLATE = loadedRun(
  "run-plate",
  "Run with a Plate",
  { kind: "plate" },
  (hip, lean) => ({
    // The center of the plate (radius 20) is 16 below the base of the neck and 13 in front of the line of the torso:
    // the plate touches the chest (9.5), and its top is below the chin.
    hands: inFront(hip, lean, 16, 13),
    grip: 20,
    elbowTo: 0,
    elbowsOut: 0.6,
  }),
);
