// Run with a plate overhead (Walsh): the run, with a plate of 20 kg held overhead on locked arms. The hands
// hold its rim at the sides. The arms do not swing.
import type { Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import { BODY, up } from "../skeleton.ts";
import { loadedRun } from "./run.ts";

const GRIP = 20;
/** Active shoulders under a load overhead. */
const SHRUG = 3;
/** A straight arm in the side view: the hand is `GRIP - 13` out to the side of the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);

const run = loadedRun(
  "run-plate-overhead",
  "Run with a Plate Overhead",
  { kind: "plate" },
  (hip, lean) => {
    const neck = shoulderOf(hip, lean);
    const along = up(lean);
    const joint = { x: neck.x + along.x * SHRUG, y: neck.y + along.y * SHRUG };
    // The hands are straight above the shoulder joints: the plate (radius 20) is above the head.
    return {
      hands: { x: joint.x + 1, y: joint.y - Math.sqrt(REACH ** 2 - 1) },
      grip: GRIP,
      shrug: SHRUG,
      elbowTo: 60,
      elbowsOut: 2,
    };
  },
);

/** The views of the run, higher: the plate overhead reaches y = -10. */
export const RUN_PLATE_OVERHEAD: Exercise = {
  ...run,
  views: [
    { label: "Seite", yaw: 0, box: [4, -16, 150, 228] },
    { label: "Vorn", yaw: 90, box: [-60, -16, 120, 228] },
  ],
};
