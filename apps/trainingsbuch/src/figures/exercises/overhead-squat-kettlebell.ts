// Single-arm Overhead Squat with a kettlebell (Arnie: "21 overhead squats, left arm"). The legs, the hips and
// the torso are those of `overhead-squat.ts`. The near arm is locked over its shoulder, the bell lies on the back of
// the forearm. The free arm goes out to the side as a counterweight, as in the single-arm thruster.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import { BODY, up, type Pose } from "../skeleton.ts";
import { OVERHEAD_SQUAT } from "./overhead-squat.ts";

/** The near hand overhead: a little inside the shoulder joint (13), so the bell is over the middle of the foot. */
const OVERHEAD_Z = 10;
/** A locked arm, a very little shorter than the bones (62), so that the engine finds the elbow. */
const ARM = 61.9;
/** The free hand, as in the single-arm thruster: in front of the shoulders, below them and out to the side. */
const FREE = { dx: 10, dy: 45, z: BODY.shoulderHalf + Math.sqrt(61.5 ** 2 - 10 ** 2 - 45 ** 2) };

function oneArm(pose: Pose): Pose {
  const neck = shoulderOf(pose.hip, pose.lean);
  const along = up(pose.lean);
  const shrug = pose.shrug ?? 0;
  const joint = { x: neck.x + along.x * shrug, y: neck.y + along.y * shrug };
  // The bell stays over the same spot as the bar of the overhead squat.
  const bar = "x" in pose.hands ? pose.hands : pose.hands[0];
  const dx = bar.x - joint.x;
  const loaded = {
    x: bar.x,
    y: joint.y - Math.sqrt(ARM ** 2 - dx ** 2 - (OVERHEAD_Z - BODY.shoulderHalf) ** 2),
    z: OVERHEAD_Z,
  };
  const free = { ...handAt(pose.hip, pose.lean, FREE.dx, FREE.dy), z: FREE.z };
  return { ...pose, head: (pose.head ?? 0) / 2, hands: [loaded, free], elbowTo: -90, elbowsOut: 1 };
}

export const OVERHEAD_SQUAT_KETTLEBELL: Exercise = {
  key: "overhead-squat-kettlebell",
  title: "Overhead Squat einarmig (Kettlebell)",
  equipment: { kind: "kettlebells", hand: 0 },
  views: [SIDE, FRONT],
  start: oneArm(OVERHEAD_SQUAT.start),
  steps: OVERHEAD_SQUAT.steps.map((step) => ({
    ...step,
    to: oneArm(step.to),
    ...(step.via === undefined ? {} : { via: step.via.map(oneArm) }),
    arms: ["carry", "carry"],
  })),
};
