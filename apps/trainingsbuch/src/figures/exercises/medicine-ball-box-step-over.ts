// Medicine-ball Box Step-over (Open 26.1): the box step-over of `box-step-over.ts` with a medicine ball in
// both hands. The standard does not set a hold, but the ball may not rest on a thigh and may not touch the box. Both
// feet touch the top of the box. The ball is in front of the chest, as in the run with a medicine ball.
import type { Exercise } from "../exercise.ts";
import { BALL } from "../skeleton.ts";
import { stepOver } from "./box-step-over.ts";
import { BOX, TOP } from "./step-up.ts";
import { inFront } from "./run.ts";

/** The torso leans at most this much. */
const LEAN = 10;
/** The center of the ball is this far below the base of the neck: the ball is high on the chest. */
const BELOW = 0;

export const MEDICINE_BALL_BOX_STEP_OVER: Exercise = stepOver({
  key: "medicine-ball-box-step-over",
  title: "Medicine-ball Box Step-over",
  equipment: { kind: "box", ...BOX },
  load: { kind: "medicineball" },
  // The near foot goes only 8 above the edge of the box (17 without a ball): so the knee stays below the ball.
  above: { x: 95, y: TOP - 8 },
  // Open 26.1 does not ask for open hips and knees on the box. The figure stays bent and does not stop on the top.
  low: 10,
  map: (pose) => {
    // With the ball in front, the torso stays more upright than in the step-over without a load: the ball is a
    // counterweight, and a torso that leans would put the ball onto the thigh of the leg on the box.
    const lean = Math.min(pose.lean, LEAN);
    // The ball touches the chest: its center is 27 in front of the torso.
    const ball = inFront(pose.hip, lean, BELOW, 27);
    return {
      ...pose,
      lean,
      hands: { x: ball.x, y: ball.y + BALL.above },
      grip: 17,
      elbowTo: 0,
      elbowsOut: 0.8,
    };
  },
});
