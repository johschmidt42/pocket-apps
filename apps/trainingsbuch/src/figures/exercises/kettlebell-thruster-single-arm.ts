// Single-arm Kettlebell Thruster (Bowen): the thruster of `dumbbell-thruster.ts` with one kettlebell in the
// near hand. The bell lies on the outside of the forearm in the rack and overhead. The free arm is out to the side.
import type { Exercise } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { BODY, type Pose, type Spot, type Step } from "../skeleton.ts";
import { DUMBBELL_THRUSTER } from "./dumbbell-thruster.ts";

/** The z of the hand with the kettlebell: the grip of the dumbbell thruster. */
const LOADED_Z = 20;
/**
 * The free hand: 10 in front of the shoulders, 45 below them, and out to the side, so that the arm is nearly straight
 * (61.5 of 62). The engine has one direction of the elbows for both arms: it changes for the press. A nearly straight
 * free arm does not show it, a bent one goes out to the side.
 */
const FREE = { dx: 10, dy: 45, z: BODY.shoulderHalf + Math.sqrt(61.5 ** 2 - 10 ** 2 - 45 ** 2) };

/**
 * The near hand holds the kettlebell as in the dumbbell thruster. The free arm goes out to the side and a little
 * forward, as a counterweight: a free arm that hangs down goes through the thigh in the squat. `z` is the distance to
 * the side, for both hands: the engine puts the far hand on the far side.
 */
function oneArm(pose: Pose): Pose {
  const loaded: Spot = "x" in pose.hands ? pose.hands : pose.hands[0];
  const free = handAt(pose.hip, pose.lean, FREE.dx, FREE.dy);
  return {
    ...pose,
    hands: [
      { x: loaded.x, y: loaded.y, z: LOADED_Z },
      { ...free, z: FREE.z },
    ],
  };
}

/** The arm with the kettlebell moves as in the dumbbell thruster. The free arm keeps its place to the shoulders. */
const oneArmStep = (step: Step): Step => ({
  ...step,
  to: oneArm(step.to),
  ...(step.via === undefined ? {} : { via: step.via.map(oneArm) }),
  arms: [
    step.arms === undefined ? "fk" : typeof step.arms === "string" ? step.arms : step.arms[0],
    "carry",
  ],
});

export const KETTLEBELL_THRUSTER_SINGLE_ARM: Exercise = {
  ...DUMBBELL_THRUSTER,
  key: "kettlebell-thruster-single-arm",
  title: "Kettlebell Thruster einarmig",
  equipment: { kind: "kettlebells", hand: 0 },
  start: oneArm(DUMBBELL_THRUSTER.start),
  steps: DUMBBELL_THRUSTER.steps.map(oneArmStep),
};
