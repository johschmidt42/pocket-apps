// Handstand walk (Open 18.4, 19.3, 20.3): forward on the hands, as on a treadmill. The standard: the course
// has sections of 5 ft (1.5 m), and a section counts when both hands cross its line. A foot on the floor ends the try.
// Upside down, the figure looks to -x: so it walks to -x, and the floor moves to +x (a negative `belt`).
// The body leans a little forward over the hands (the shoulders are in front of them), and the legs hang a little back
// over the hips with soft knees: so the athlete is always about to fall forward, and the hands step under him.
// One function makes a pose from the part of the loop. The near hand steps at 0, the far hand at 0.5.
import { FRONT, type Exercise, type View } from "../exercise.ts";
import { BODY, GROUND, type Pose, type Spot, type Step } from "../skeleton.ts";

const RAD = Math.PI / 180;
/** The time of one loop (two steps), in seconds. */
const LOOP = 0.66;
const POSES = 40;
/** The part of the loop in which a hand is on the floor. More than half: both hands are down for a short time. */
const STANCE = 0.6;
/** Each hand goes this far forward on the floor in one loop: 34 units in 0.66 s, about 0.5 m/s. */
const STRIDE = 34;
const SHIFT = STRIDE * STANCE;
const HAND_Y = GROUND - 4.5;
const HAND_LIFT = 2.5;
/** The hands are a little wider than the shoulder joints (z = 13). */
const GRIP = 16;
const SHRUG = 3;
/** How far the body leans forward (to -x) from the vertical, in degrees. */
const TILT = 10;
/** The x of the middle of the shoulder joints. The hands step around a spot 3 behind it (+x). */
const JOINT_X = 70;
const HANDS_X = JOINT_X + 3;
/** The highest place of the shoulder joints where the far hand of the stance still reaches the floor. */
const REACH = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);
const JOINT_Y = HAND_Y - Math.sqrt(REACH ** 2 - (SHIFT / 2 + 3) ** 2);
/** The legs: hip to ankle, a little shorter than straight (80): the knees are a little soft. */
const LEG = 79;
/** The legs point this far back (to +x) from the vertical: they balance the shoulders in front of the hands. */
const LEGS_BACK = 14;

const wrap = (part: number) => part - Math.floor(part);
/** The direction from the feet to the head of a body that tilts by `tilt` degrees: forward is -x. */
const along = (tilt: number) => ({ x: -Math.sin(tilt * RAD), y: Math.cos(tilt * RAD) });

/**
 * Where a hand is on its way at its part of the loop, and how high. 0 is the moment it comes down in front.
 * On the floor it moves back (+x) with the belt. In the air it comes forward on a curve that starts and ends at the
 * speed of the belt, so it does not slide.
 */
function stepOf(part: number): { dx: number; lift: number } {
  const p = wrap(part);
  if (p <= STANCE) return { dx: -SHIFT / 2 + STRIDE * p, lift: 0 };
  const q = (p - STANCE) / (1 - STANCE);
  const slope = STRIDE * (1 - STANCE);
  const q2 = q * q;
  const q3 = q2 * q;
  const dx =
    (2 * q3 - 3 * q2 + 1) * (SHIFT / 2) +
    (q3 - 2 * q2 + q) * slope +
    (-2 * q3 + 3 * q2) * (-SHIFT / 2) +
    (q3 - q2) * slope;
  return { dx, lift: Math.sin(Math.PI * q) ** 2 };
}

function handOf(part: number): Spot {
  const { dx, lift } = stepOf(part);
  return { x: HANDS_X + dx, y: HAND_Y - HAND_LIFT * lift };
}

/** The pose at one part of the loop. */
function pose(part: number): Pose {
  // The body sways a little forward and back in each step, and the legs answer it.
  const sway = Math.sin(4 * Math.PI * part);
  const tilt = TILT + 0.8 * sway;
  const joint = { x: JOINT_X - 0.6 * sway, y: JOINT_Y };
  const upper = along(tilt);
  const neck = { x: joint.x - upper.x * SHRUG, y: joint.y - upper.y * SHRUG };
  const hip = { x: neck.x - upper.x * BODY.torso, y: neck.y - upper.y * BODY.torso };
  const back = (LEGS_BACK - 2 * sway) * RAD;
  // The two feet are a little apart, the far foot a little more back.
  const foot = (extra: number) => ({
    x: hip.x + Math.sin(back + extra * RAD) * LEG,
    y: hip.y - Math.cos(back + extra * RAD) * LEG,
  });
  return {
    hip,
    lean: 180 + tilt,
    shrug: SHRUG,
    // The eyes look at the floor in front of the hands.
    head: -18,
    feet: [foot(-2), foot(3)],
    // Pointed feet, in line with the shins.
    toes: [-LEGS_BACK + 2, -LEGS_BACK - 3],
    stance: BODY.hipHalf,
    knees: 0,
    hands: [handOf(part), handOf(part + 0.5)],
    grip: GRIP,
    elbowTo: 90,
    elbowsOut: 0.6,
  };
}

const SIDE: View = { label: "Seite", yaw: 0, box: [10, -26, 130, 238] };

const start = pose(0);
const steps: Step[] = [];
for (let i = 1; i <= POSES; i++) {
  steps.push({
    to: i === POSES ? start : pose(i / POSES),
    seconds: LOOP / POSES,
    ...(i === 1 ? { label: "Rechte Hand" } : {}),
    ...(i === POSES / 2 + 1 ? { label: "Linke Hand" } : {}),
    ease: "linear",
    legs: "line",
    arms: "line",
  });
}

export const HANDSTAND_WALK: Exercise = {
  key: "handstand-walk",
  title: "Handstand Walk",
  equipment: { kind: "none" },
  belt: -STRIDE,
  views: [SIDE, FRONT],
  start,
  steps,
};
