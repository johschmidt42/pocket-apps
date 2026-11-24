// Run with a medicine ball (Del, DVB, Gallant, Whitt): the run, with the ball held in both hands in front
// of the chest. The hands are at the sides of the ball, the elbows point down. The arms do not swing.
import { BALL } from "../skeleton.ts";
import { inFront, loadedRun } from "./run.ts";

export const RUN_MEDICINE_BALL = loadedRun(
  "run-medicine-ball",
  "Run with a Medicine Ball",
  { kind: "medicineball" },
  (hip, lean) => {
    // The center of the ball (radius 17) is 16 below the base of the neck and 27 in front of the line of the torso:
    // the ball touches the chest (9.5). The hands are 6 below its center (`BALL.above`), at its sides.
    const ball = inFront(hip, lean, 16, 27);
    return { hands: { x: ball.x, y: ball.y + BALL.above }, grip: 17, elbowTo: 0, elbowsOut: 0.8 };
  },
);
