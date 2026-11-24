// Strict handstand push-up at a wall: the body is one straight line, upside down. Only the arms work.
// The kipping handstand push-up (`kipping-handstand-push-up.ts`) uses the same poses and the same builder.
import { FRONT, SIDE, type Exercise, type View } from "../exercise.ts";
import { BODY, GROUND, type Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
export const WALL = 120;
/** The heels touch the wall when the ankle is here, with `toes: 270`. */
const ANKLE_X = WALL - 7.5;
const LEG = BODY.thigh + BODY.shin;
/** From the ankles to the base of the neck: the body is one line of this length. */
const LINE = LEG + BODY.torso;
/**
 * The hands stay on this spot in the whole loop. They are 22 in front of the wall and wider than the shoulders
 * (the shoulder joint is at z = 13): at the bottom, the forearms are then nearly vertical in the front view.
 */
export const HANDS = { x: WALL - 22, y: GROUND - 4.5 };
export const GRIP = 28;
/**
 * The elbows point back to the wall (90 in the side view, the figure looks to -x) and out to the sides.
 * With these two values, the upper arm is about 45 degrees away from the body at the bottom.
 */
const ELBOWS = { elbowTo: 90, elbowsOut: 1.1 };

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** The direction from the feet to the head of a body that tilts by `tilt` degrees from the vertical. */
const along = (tilt: number) => ({ x: -Math.sin(tilt * RAD), y: Math.cos(tilt * RAD) });
/** A direction in the side view: 0 is down, 90 is to the wall, 180 is up, -90 is away from the wall. */
const direction = (angle: number) => ({ x: Math.sin(angle * RAD), y: Math.cos(angle * RAD) });

/** Active shoulders at the top: the shoulder joints are this far nearer to the head, and the body is that much higher. */
const TOP_SHRUG = 4;
// Top: the shoulder joints are over the hands, and the arms are straight. The hand is 0.03 inside the reach of
// the arm (62), so that it is exactly on its spot.
const TOP_TILT = Math.asin((ANKLE_X - HANDS.x) / (LINE + TOP_SHRUG)) / RAD;
const TOP_Y = HANDS.y - Math.sqrt(61.97 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);
// Bottom: the top of the head (25 + 11 from the shoulders) touches the floor. The shoulders are 16 in front of
// the hands, and the head is 25 in front of them: the head and the hands make a triangle. No shrug.
const BOTTOM_TILT = 14.2;
const BOTTOM_Y = GROUND - 36 * Math.cos(BOTTOM_TILT * RAD);
/**
 * The tilt of the head at the top: it is a little back, the eyes look at the floor between the hands.
 * At the bottom it is 0: the top of the head is on the floor.
 */
const TOP_HEAD = -10;

export type Handstand = {
  /**
   * Where the shoulder joints are on their way: 0 is the top (lockout), 1 is the bottom (the head on the floor).
   * It sets the place of the shoulder joints, the shrug and the tilt of the head. They are the same in the
   * strict and in the kipping version.
   */
  part: number;
  /**
   * The tilt of the torso from the vertical, in degrees. Without it, the body is one straight line from the heels
   * to the shoulders. With more tilt, the hips are nearer to the wall (the kip).
   */
  torso?: number;
  /** The bend of the torso: a positive value is a round back. */
  bend?: number;
  /**
   * The legs of a kip, as two angles in the side view: where the thigh points and where the shin points
   * (0 down, 90 to the wall, 180 up, -90 away from the wall). Without it, the heels are on the wall.
   */
  tuck?: { thigh: number; shin: number };
  /** For heels on the wall: the distance from the hip to the ankle. 80 is a straight leg (the default). */
  leg?: number;
};

/**
 * One pose of a handstand at the wall. Without `torso`, the ankles are exactly on the wall line and the body is
 * straight: the tilt of the line then sets the x of the shoulders.
 */
export function handstand(body: Handstand): Pose {
  const tilt = mix(TOP_TILT, BOTTOM_TILT, body.part);
  const shrug = mix(TOP_SHRUG, 0, body.part);
  const torso = body.torso ?? tilt;
  const bend = body.bend ?? 0;
  // The shoulder joints (the middle of the two) are on the same way in each version.
  const joint = {
    x: ANKLE_X - (LINE + shrug) * Math.sin(tilt * RAD),
    y: mix(TOP_Y, BOTTOM_Y, body.part),
  };
  // A shrug moves the joints along the upper half of the torso, away from the base of the neck.
  const upper = along(torso + bend / 2);
  const neck = { x: joint.x - upper.x * shrug, y: joint.y - upper.y * shrug };
  const hip = { x: neck.x - along(torso).x * BODY.torso, y: neck.y - along(torso).y * BODY.torso };
  const leg = body.leg ?? LEG;
  const thigh = direction(body.tuck?.thigh ?? 0);
  const shin = direction(body.tuck?.shin ?? 0);
  const feet =
    body.tuck === undefined
      ? { x: ANKLE_X, y: hip.y - Math.sqrt(leg ** 2 - (ANKLE_X - hip.x) ** 2) }
      : { x: hip.x + (thigh.x + shin.x) * 40, y: hip.y + (thigh.y + shin.y) * 40 };
  return {
    hip,
    lean: 180 + torso,
    bend,
    shrug,
    // The head keeps its direction in space when the torso tilts or bends: the top of the head stays on the floor.
    head: tilt + mix(TOP_HEAD, 0, body.part) - torso - bend / 2,
    feet,
    // The ankle is exactly in line with the hip joint (z = 7): the leg is straight at 80.
    stance: BODY.hipHalf,
    knees: 0,
    // The toes point away from the wall.
    toes: 270,
    hands: HANDS,
    grip: GRIP,
    ...ELBOWS,
  };
}

/** The lockout: straight arms, active shoulders, the heels on the wall. */
export const TOP = handstand({ part: 0 });
/** The tripod: the top of the head is on the floor in front of the hands. The body is one straight line. */
export const BOTTOM = handstand({ part: 1 });
// Poses on the way, for `via`. Between two poses, the engine turns the arm bones, and the shoulders follow them.
// Without these poses, the heels leave the wall line.
// The last pose is near the floor: the part after it has the label "Kopf am Boden".
export const WAY = [0.3, 0.6, 0.9].map((part) => handstand({ part }));

export const VIEWS: readonly [View, View] = [SIDE, FRONT];

export const HANDSTAND_PUSH_UP: Exercise = {
  key: "handstand-push-up",
  title: "Strict Handstand Push-up",
  equipment: { kind: "wall", wall: WALL },
  views: VIEWS,
  start: TOP,
  // "hands": the hands carry the body. "fk": the straight legs turn with the body, and the heels slide on the wall.
  // There is no hold at the bottom: the "soft" ease slows the body down before the floor and after it, and that
  // is the short touch. A hold of 0.1 s more looked like a rest on the head.
  steps: [
    { to: TOP, seconds: 0.3, label: "Handstand" },
    {
      to: BOTTOM,
      via: WAY,
      seconds: 1.0,
      label: ["Absenken", "Absenken", "Absenken", "Kopf am Boden"],
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
    {
      to: TOP,
      via: [...WAY].reverse(),
      seconds: 0.9,
      label: ["Kopf am Boden", "Drücken", "Drücken", "Drücken"],
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
  ],
};
