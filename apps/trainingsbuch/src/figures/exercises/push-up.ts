// Push-up: the body is one straight line. It turns around the toes, down to the floor and up again.
import type { Exercise } from "../exercise.ts";
import { BODY, GROUND, tiptoe, up, type Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
const LEG = BODY.thigh + BODY.shin;

/** The toes stay on this spot in the whole loop. The figure looks to +x: the feet are on the left. */
export const TOE_X = 30;
/** A hand on the floor: half the line width of the forearm above the ground. */
export const HAND_Y = GROUND - 4.5;
/**
 * The hands are just outside the shoulders (the shoulder joints are at z = 13). With the hands under the shoulder
 * joints, the elbows can only go straight out to the side: a T (the user saw it, 2026-11-23). With this grip, the
 * forearm is nearly vertical at the bottom, and the upper arm can be 45 degrees away from the body.
 */
const GRIP = 21;

/**
 * The body as one straight line from the ankles to the shoulders. `tilt` is the angle of this line above
 * the floor, in degrees. `toes` is the angle of the feet: 180 points straight down.
 * The toe stays on its spot, so the ankle moves a little when the foot turns.
 */
function body(tilt: number, toes: number) {
  const foot = up(toes);
  // `tiptoe()` takes the x of the ankle. The toe is 15 along the foot and 1.5 below its line.
  const ankle = tiptoe(TOE_X - foot.x * 15 + foot.y * 1.5, toes);
  const along = { x: Math.cos(tilt * RAD), y: -Math.sin(tilt * RAD) };
  const hip = { x: ankle.x + along.x * LEG, y: ankle.y + along.y * LEG };
  const shoulder = { x: hip.x + along.x * BODY.torso, y: hip.y + along.y * BODY.torso };
  return { ankle, hip, shoulder, lean: 90 - tilt, toes };
}

/** The tilt at which the shoulders are at the height `y`. */
function tiltFor(shoulderY: number, toes: number): number {
  const ankle = tiptoe(0, toes);
  return Math.asin((ankle.y - shoulderY) / (LEG + BODY.torso)) / RAD;
}

// Top: the arms are straight and vertical. The hand is 0.03 inside the reach of the arm (62), so that it is
// exactly on its spot. With 0.15 inside, the elbow is 2 units behind the arm line: a visible bend.
const TOP_TOES = 160;
const TOP_SHOULDER_Y = HAND_Y - Math.sqrt(61.97 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);
const TOP_BODY = body(tiltFor(TOP_SHOULDER_Y, TOP_TOES), TOP_TOES);
/** The hands stay on this spot in the whole loop: under the shoulders of the plank. */
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const HANDS = { x: TOP_BODY.shoulder.x, y: HAND_Y };

// Bottom: the chest (half width 9.5) is 3 units above the floor. The body is nearly level.
export const BOTTOM_TOES = 172;
const BOTTOM_BODY = body(tiltFor(GROUND - 9.5 - 3, BOTTOM_TOES), BOTTOM_TOES);

/** The part of the way down at which the phase "Unten" starts. */
export const PART = 0.6;
// The engine turns the body at a constant rate from the top to the bottom. So this pose is on that way.
const LOW_BODY = body(
  90 - mix(TOP_BODY.lean, BOTTOM_BODY.lean, PART),
  mix(TOP_TOES, BOTTOM_TOES, PART),
);

/**
 * Where the elbows point. CrossFit: the upper arms are about 45 degrees away from the body, and from above the head and
 * the elbows form an arrow, not a T. The elbows move back and stay near the body. The three pairs come from a search:
 * on the way down, the elbow goes out in one steady move, and the upper arm is never more than 45 degrees from the body.
 */
export type Elbows = { elbowTo: number; elbowsOut: number };
const TOP_ELBOWS: Elbows = { elbowTo: -100, elbowsOut: 0 };
const LOW_ELBOWS: Elbows = { elbowTo: -110, elbowsOut: 0.1 };
export const BOTTOM_ELBOWS: Elbows = { elbowTo: -175, elbowsOut: 0.2 };

export function pose(
  b: Pick<ReturnType<typeof body>, "ankle" | "hip" | "lean" | "toes">,
  head: number,
  elbows: Elbows,
): Pose {
  return {
    hip: b.hip,
    lean: b.lean,
    head,
    feet: b.ankle,
    toes: b.toes,
    // The ankle is exactly behind the hip joint (z = 7): the leg is straight at 80.
    stance: BODY.hipHalf,
    knees: 0,
    hands: HANDS,
    grip: GRIP,
    ...elbows,
  };
}

// The head looks a little forward. At the bottom it looks more forward: the face does not touch the floor.
export const TOP = pose(TOP_BODY, -8, TOP_ELBOWS);
export const LOW = pose(LOW_BODY, mix(-8, -22, PART), LOW_ELBOWS);
const BOTTOM = pose(BOTTOM_BODY, -22, BOTTOM_ELBOWS);

export const DOWN = 0.9;
export const UP = 0.7;

export const PUSH_UP: Exercise = {
  key: "push-up",
  title: "Push-up",
  equipment: { kind: "none" },
  // The body is level: the box is wide and low. At the bottom, the head reaches x = 190.
  views: [{ label: "Seite", yaw: 0, box: [8, 96, 196, 120] }],
  start: TOP,
  // `anchor: "feet"`: the straight legs turn around the ankles, and the hip goes on an arc. The lean changes at
  // the same rate, so the body stays one line. The hands keep their spot (`arms: "line"`).
  steps: [
    { to: LOW, seconds: DOWN * PART, label: "Runter", ease: "in", anchor: "feet", arms: "line" },
    {
      to: BOTTOM,
      seconds: DOWN * (1 - PART),
      label: "Unten",
      ease: "out",
      anchor: "feet",
      arms: "line",
    },
    { to: LOW, seconds: UP * (1 - PART), label: "Unten", ease: "in", anchor: "feet", arms: "line" },
    { to: TOP, seconds: UP * PART, label: "Hoch", ease: "out", anchor: "feet", arms: "line" },
    { to: TOP, seconds: 0.5, label: "Stütz", arms: "line" },
  ],
};
