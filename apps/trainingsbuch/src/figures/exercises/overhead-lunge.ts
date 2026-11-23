// Overhead Lunge: the walking lunge with a load on locked arms over the head. The legs are `walking-lunge.ts`.
// The load stays over the hip on the whole way. Three forms, because the workouts ask for three loads:
// a plate in both hands, a barbell, and one dumbbell in one hand while the other arm hangs.
import type { Exercise } from "../exercise.ts";
import { type Pose, up } from "../skeleton.ts";
import { handOf, type Upper } from "./walking-lunge.ts";

type Spot = { x: number; y: number };

/** The length of the arm: just inside the reach of 62, so that the hand is on its spot. */
const ARM = 61.95;
const SHOULDER_Z = 13;

/** The hand of a straight arm overhead. It is `ahead` in front of the hip, so the load is over the body. */
function overhead(hip: Spot, lean: number, grip: number, shrug: number, ahead = 1): Spot {
  const torso = up(lean);
  const joint = { x: hip.x + torso.x * (46 + shrug), y: hip.y + torso.y * (46 + shrug) };
  const flat = Math.sqrt(ARM ** 2 - (grip - SHOULDER_Z) ** 2);
  const x = hip.x + ahead;
  return { x, y: joint.y - Math.sqrt(flat ** 2 - (x - joint.x) ** 2) };
}

/** Both hands overhead. The head goes forward between the arms, the shoulders push up into the load. */
export const bothHands =
  (grip: number): Upper =>
  (_part, hip, lean) => ({
    hands: overhead(hip, lean, grip, 3),
    grip,
    shrug: 3,
    head: 8,
    elbowTo: -90,
    elbowsOut: 4,
  });

/** The near hand holds the dumbbell overhead, the far arm hangs and swings a little. */
export const oneDumbbell: Upper = (part, hip, lean) => {
  const up0: Pose["hands"] = [
    { ...overhead(hip, lean, 15, 0), z: 15 },
    { ...handOf(part + 0.5, hip, lean), z: 19 },
  ];
  return { hands: up0, grip: 19, head: 6, elbowTo: -90, elbowsOut: 1 };
};

export const OVERHEAD_VIEWS: Exercise["views"] = [
  { label: "Seite", yaw: 0, box: [14, -24, 170, 236] },
  { label: "Vorn", yaw: 90, box: [-60, -24, 120, 236] },
];
