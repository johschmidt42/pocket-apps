// Air Bike (Echo Bike, Assault Bike). The feet turn the cranks, the hands push and pull two levers.
// One function makes a pose from the crank angle. The steps are a loop over one turn.
import type { Exercise, View } from "../exercise.ts";
import { BIKE, leverHand, pedalFoot } from "../machines.ts";
import type { Pose, Step } from "../skeleton.ts";

const RAD = Math.PI / 180;
/** The x of the hip joint on the saddle. The machine goes from X - 14 to X + 104. */
const X = 60;
/** The number of poses in one turn of the cranks. */
const POSES = 24;
/** The time of one turn: 60 turns per minute. */
const TURN = 1;
/** The swing of each lever to each side, in degrees. */
const SWING = 14;
/** The lean of the torso. With more lean, the arm that pushes cannot get nearly straight. */
const LEAN = 27;

/** The hip is on the saddle place. */
const HIP = { x: X, y: BIKE.hipY };

/**
 * The pose with the near foot at the crank angle `angle` (0 is the top, 90 is in front, 180 is the bottom).
 * The far foot is half a turn away. Each lever is joined to the crank of its side: with the foot in front,
 * the grip of the same side is back.
 */
function pose(angle: number): Pose {
  // The foot is nearly level. The heel drops when the foot pushes down in front and lifts when it comes up behind.
  // The heel starts to drop 30 degrees before the top: the knee is then a little less deep at the top.
  const toes = (a: number) => 90 - 6 * Math.sin((a + 30) * RAD);
  const swing = -SWING * Math.sin(angle * RAD);
  return {
    hip: HIP,
    lean: LEAN,
    head: -14,
    feet: [pedalFoot(X, angle, toes(angle)), pedalFoot(X, angle + 180, toes(angle + 180))],
    toes: [toes(angle), toes(angle + 180)],
    stance: 9,
    knees: 0.05,
    hands: [leverHand(X, swing), leverHand(X, -swing)],
    grip: 14,
    elbowTo: -50,
  };
}

/** The near foot starts at the top of the circle. */
const START = pose(0);

const steps: Step[] = [];
for (let i = 1; i <= POSES; i++) {
  steps.push({
    to: i === POSES ? START : pose((360 * i) / POSES),
    seconds: TURN / POSES,
    ...(i === 1 ? { label: "Treten" } : {}),
    ease: "linear",
    legs: "line",
    arms: "line",
  });
}

const SIDE: View = { label: "Seite", yaw: 0, box: [32, 22, 142, 190] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, 22, 120, 190] };

export const BIKE_EXERCISE: Exercise = {
  key: "bike",
  title: "Air Bike",
  equipment: { kind: "bike", x: X },
  views: [SIDE, FRONT],
  start: START,
  steps,
};
