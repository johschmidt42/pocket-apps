// Wall ball: a full squat with the ball at the chest, then the legs throw the ball at a target on the wall.
import type { Exercise, View } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { tiptoeFromToe, type Pose } from "../skeleton.ts";

/** The wall. The tip of the toe of a flat foot is at x = 93.5: the toes are 40 units from the wall. */
const WALL = 134;
const TARGET = -87;
/** The center of the ball (radius 17) when it touches the wall at the target line. */
const TOUCH = { x: WALL - 17, y: TARGET };

const STANCE = 14;
const FLAT = { x: 74, y: 200 };
/** The x of the toe end of the foot bone of a flat foot. The toe stays there when the heel rises. */
const TOE = FLAT.x + 15;

const base = { stance: STANCE, knees: 0.55, grip: 15, elbows: 0.6, elbowsOut: 0.5 };

/** The y of the hip over this ankle, with legs that are just straight (79.9 of 80). */
function tallHip(ankle: { x: number; y: number }, x: number): { x: number; y: number } {
  return { x, y: ankle.y - Math.sqrt(79.9 ** 2 - (STANCE - 7) ** 2 - (x - ankle.x) ** 2) };
}

/** A pose from the hip, the lean, the tilt of the head and the place of the hands relative to the shoulders. */
function pose(
  hip: { x: number; y: number },
  lean: number,
  head: number,
  dx: number,
  dy: number,
  feet = FLAT,
  toes = 90,
): Pose {
  return { ...base, hip, lean, head, feet, toes, hands: handAt(hip, lean, dx, dy) };
}

// The rack: the center of the ball is 6 above the hands. The ball is in front of the chest and under the chin.
const RACK = { dx: 25, dy: 1 };

// The bottom: the hip joint is below the knee joint. The torso is more upright than in the air squat (34 degrees).
const BOTTOM = pose({ x: 58, y: 174 }, 20, -30, RACK.dx, RACK.dy);

// The way up. With `follow: "hands"`, the hands get faster at a constant rate. The hip moves as the poses say:
// from pose to pose, the arms do a larger part of the way of the ball, so the hips get slower when the arms push.
// The ball is in the rack, the chest rises with the hips.
const UP1 = pose({ x: 60, y: 160 }, 18.5, -28, RACK.dx, RACK.dy);
// The arms start to push before the legs are straight: the force of the legs goes into the ball.
const UP2 = pose({ x: 65, y: 144 }, 14, -25, RACK.dx, RACK.dy - 6);
// The ball is in front of the face. The legs are nearly straight.
const PUSH = pose({ x: 72, y: 128 }, 8, -22, 24, -22);
// The release: the heels are just off the ground, the arms are nearly straight and point at the target.
const HEEL = tiptoeFromToe(TOE, 108);
const RELEASE = pose(tallHip(HEEL, 77), 1, -20, 19, -54, HEEL, 108);
// After the release, the arms and the feet finish their way.
const HIGH = tiptoeFromToe(TOE, 120);
const REACH = pose(tallHip(HIGH, 78), 0, -24, 18, -62, HIGH, 120);
// Ready hands: the body stands tall on flat feet. The hands wait above the forehead, a little bent, below the
// place where the ball left them.
const READY = pose(tallHip(FLAT, 75), 0, -26, 21, -52);

// The way down: the arms give way first, then the hips sink faster, then the two go down together.
const DOWN1 = pose({ x: 73.5, y: 126 }, 2, -24, 23, -32);
const DOWN2 = pose({ x: 69, y: 137 }, 8, -24, 24, -14);
const DOWN3 = pose({ x: 64, y: 151 }, 15, -26, RACK.dx, RACK.dy - 6);

const SIDE: View = { label: "Seite", yaw: 0, box: [20, -115, 130, 327] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, -115, 120, 327] };

export const WALL_BALL: Exercise = {
  key: "wall-ball",
  title: "Wall Ball",
  equipment: { kind: "wallball", wall: WALL, target: TARGET },
  views: [SIDE, FRONT],
  start: BOTTOM,
  steps: [
    {
      to: PUSH,
      via: [UP1, UP2],
      seconds: 0.31,
      label: "Strecken",
      ease: "in",
      anchor: "feet",
      arms: "carry",
      follow: "hands",
    },
    { to: RELEASE, seconds: 0.094, label: "Wurf", ease: "linear", anchor: "feet", arms: "carry" },
    {
      to: REACH,
      seconds: 0.08,
      label: "Ball fliegt",
      ease: "out",
      anchor: "feet",
      arms: "carry",
      throw: TOUCH,
    },
    {
      to: READY,
      seconds: 0.4,
      label: "Ball fliegt",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
      throw: TOUCH,
    },
    { to: READY, seconds: 0.44, label: "Ball fliegt", throw: TOUCH },
    {
      to: BOTTOM,
      via: [DOWN1, DOWN2, DOWN3],
      seconds: 0.56,
      label: "Fangen und Kniebeuge",
      ease: "out",
      anchor: "feet",
      arms: "carry",
      follow: "hands",
    },
  ],
};
