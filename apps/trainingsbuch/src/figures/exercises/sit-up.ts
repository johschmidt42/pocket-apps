// AbMat sit-up: the figure lies on its back, swings the arms over the head and sits up to its feet.
import type { Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import { GROUND, up, type Pose } from "../skeleton.ts";

/** The hip is the fixed point of the whole loop. It sits on the floor: half the width of the torso above the ground. */
const HIP = { x: 100, y: GROUND - 9.5 };

// The legs: the butterfly position. They are the same in each pose.
/** The feet lie on their outer edges, the toes point forward and a little up. */
const TOES = 70;
/** The ankles. The heel of the drawn foot then touches the ground (the heel is 2.4 below the ankle, the foot is 4.5 thick). */
const FEET = { x: HIP.x + 40, y: GROUND - 7 };
// `knees: 1`: the knees are about 30 out to the side and 11 above the ankles. With 3, they are lower, and the front view
// shows the legs as one flat line.
const LEGS = { feet: FEET, toes: TOES, stance: 3, knees: 1 };

/** Half the distance between the hands. Overhead they are beside the head, at the top they are beside the toes. */
const GRIP = 12;

/**
 * One pose from two angles: the lean of the torso, and the direction of the straight arms in space
 * (0 points up, 90 forward, -90 back, as `lean`). The hand spot is 2 units beyond the reach of the arm (62),
 * so the arm is straight.
 */
function pose(lean: number, arms: number, head: number, bend: number): Pose {
  const shoulder = shoulderOf(HIP, lean);
  const along = up(arms);
  return {
    hip: HIP,
    lean,
    bend,
    // The head follows the chest, which turns by half the bend. `head` is the tilt against the line of the torso.
    head: head - bend / 2,
    ...LEGS,
    hands: { x: shoulder.x + along.x * 64, y: shoulder.y + along.y * 64 },
    grip: GRIP,
  };
}

// Bottom: the back is flat on the floor. The arms are overhead, and the hands touch the floor behind the head:
// the hands are 5 lower than the shoulder joints, so the arms point 4.6 degrees below level.
// The head is 4 degrees up from the line of the torso: with 0, it is 1.5 in the ground.
// The lower back arches over the AbMat: the middle of the torso is 5.7 above the line from the hip to the shoulders.
const BOTTOM = pose(-90, -94.6, 4, -28);

// The way up: the arms lead. In the first part, they swing 71 degrees while the torso turns 24.
// The ratio of the two rises a little from part to part (0.34, 0.46, 0.51): then the lean has no sudden change of rate.
// The back rolls up: first the head and the shoulders come up and the back gets round, then the lower back follows.
const THROW = pose(-66, -24, 14, 22);
const RISE = pose(-32, 50, 10, 30);

// Top: the shoulders are in front of the hips. The hands touch the toes from the sides, the arms are nearly straight.
const TOP: Pose = {
  // The chest is tall: the back is straight again.
  ...pose(10, 0, -6, 0),
  hands: { x: 152.5, y: 194 },
  grip: 11.5,
  elbowsOut: 1,
};

const UP = 0.75;
const DOWN = 0.95;
const TOUCH = 0.1;

export const SIT_UP: Exercise = {
  key: "sit-up",
  title: "Sit-up",
  // The front edge of the pad is 6 behind the hip joint: its highest point is under the lower back.
  equipment: { kind: "abmat", x: HIP.x - 6 },
  // The body is long and low. At the bottom the hands are at x = -8, the toes reach x = 159.
  views: [
    { label: "Seite", yaw: 0, box: [-20, 80, 192, 132] },
    { label: "Vorn", yaw: 90, box: [-60, 80, 120, 132] },
  ],
  start: BOTTOM,
  // No `anchor`: the hip stays on its spot. The legs stay too (`"line"` with the same spots).
  // The arms turn with `"fk"` through the poses of `via`: so they go over the head, not through the floor.
  steps: [
    { to: TOP, via: [THROW, RISE], seconds: UP, label: "Aufrichten", ease: "soft" },
    { to: TOP, seconds: TOUCH, label: "Füße berühren" },
    { to: BOTTOM, via: [RISE, THROW], seconds: DOWN, label: "Ablegen", ease: "soft" },
    { to: BOTTOM, seconds: TOUCH, label: "Liegen" },
  ],
};
