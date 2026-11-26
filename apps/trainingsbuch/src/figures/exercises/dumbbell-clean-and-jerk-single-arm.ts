// Dumbbell Hang Clean & Jerk with one dumbbell (Open 18.1: 5 reps with each arm; Open 25.1: the athlete
// can switch arms at any time). The near arm does the lift of `dumbbell-clean-and-jerk.ts`. The free arm hangs
// beside the body: the standard does not permit it to touch the body or the dumbbell.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import { up, type Pose } from "../skeleton.ts";
import { cleanAndJerk } from "./dumbbell-clean-and-jerk.ts";

/** How far the free hand is out to the side: a little away from the thigh. */
const FREE_Z = 19;
/** The near hand overhead: a little inside the shoulder joint (13). */
const OVERHEAD_Z = 10;
const FLAT = Math.sqrt(61.95 ** 2 - (FREE_Z - 13) ** 2);

/** The near hand holds the dumbbell where the pose has the hands. The free arm hangs straight down from its shoulder. */
function oneArm(pose: Pose): Pose {
  const hand = "x" in pose.hands ? pose.hands : pose.hands[0];
  const neck = shoulderOf(pose.hip, pose.lean);
  const along = up(pose.lean);
  const shrug = pose.shrug ?? 0;
  const joint = { x: neck.x + along.x * shrug, y: neck.y + along.y * shrug };
  const free = { x: joint.x + 1, y: joint.y + Math.sqrt(FLAT ** 2 - 1), z: FREE_Z };
  // Above the shoulder, the hand comes in over the shoulder joint: overhead, one dumbbell is over the middle of the body.
  const grip = pose.grip ?? 20;
  // The rack (the hand 9 above the joint) keeps the grip: the change starts on the way up.
  const above = Math.min(Math.max((joint.y - hand.y - 12) / 30, 0), 1);
  return { ...pose, hands: [{ ...hand, z: grip - (grip - OVERHEAD_Z) * above }, free] };
}

export const DUMBBELL_CLEAN_AND_JERK_SINGLE_ARM: Exercise = {
  key: "dumbbell-clean-and-jerk-single-arm",
  title: "Dumbbell Hang Clean & Jerk (einarmig)",
  equipment: { kind: "dumbbells", hand: 0 },
  views: [SIDE, FRONT],
  ...cleanAndJerk(oneArm),
};
