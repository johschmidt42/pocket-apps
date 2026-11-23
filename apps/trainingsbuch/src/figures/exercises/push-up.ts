// Push-up: the body is one straight line. It turns around the toes, down to the floor and up again.
import type { Exercise } from "../exercise.ts";
import { BODY, GROUND, tiptoe, up, type Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
const LEG = BODY.thigh + BODY.shin;

/** The toes stay on this spot in the whole loop. The figure looks to +x: the feet are on the left. */
const TOE_X = 30;
/** A hand on the floor: half the line width of the forearm above the ground. */
const HAND_Y = GROUND - 4.5;
/**
 * The hands are exactly under the shoulder joints (z = 13). With a wider grip, the solver turns the elbows
 * inward at the bottom, or it needs a very wide `elbowsOut`.
 */
const GRIP = BODY.shoulderHalf;

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
const TOP_SHOULDER_Y = HAND_Y - 61.97;
const TOP_BODY = body(tiltFor(TOP_SHOULDER_Y, TOP_TOES), TOP_TOES);
/** The hands stay on this spot in the whole loop: under the shoulders of the plank. */
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const HANDS = { x: TOP_BODY.shoulder.x, y: HAND_Y };

// Bottom: the chest (half width 9.5) is 3 units above the floor. The body is nearly level.
const BOTTOM_TOES = 172;
const BOTTOM_BODY = body(tiltFor(GROUND - 9.5 - 3, BOTTOM_TOES), BOTTOM_TOES);

/** The part of the way down at which the phase "Unten" starts. */
const PART = 0.6;
// The engine turns the body at a constant rate from the top to the bottom. So this pose is on that way.
const LOW_BODY = body(
  90 - mix(TOP_BODY.lean, BOTTOM_BODY.lean, PART),
  mix(TOP_TOES, BOTTOM_TOES, PART),
);

/**
 * Where the elbows point: `elbows` is back (negative), `elbowsOut` is out to the side.
 * The shoulders go 12 units forward on the way down, and the hands stay. So the forearm is vertical only
 * when the elbow goes out to the side. The three pairs come from a search over both values:
 * - the elbow is never more than 4 units in front of or behind the hand (side view),
 * - at the bottom it is 10 units above the shoulder, not 17,
 * - the upper arm is at most 61 degrees away from the body.
 * At the bottom, the hand is behind and below the shoulder. With `elbows: -1`, the solver then finds no
 * direction "back" and puts the elbow in front of the hand. So the bottom has -3.
 */
type Elbows = { elbows: number; elbowsOut: number };
const TOP_ELBOWS: Elbows = { elbows: -1, elbowsOut: 2.5 };
const LOW_ELBOWS: Elbows = { elbows: -1.5, elbowsOut: 4 };
const BOTTOM_ELBOWS: Elbows = { elbows: -3, elbowsOut: 1.5 };

function pose(b: ReturnType<typeof body>, head: number, elbows: Elbows): Pose {
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
const TOP = pose(TOP_BODY, -8, TOP_ELBOWS);
const LOW = pose(LOW_BODY, mix(-8, -22, PART), LOW_ELBOWS);
const BOTTOM = pose(BOTTOM_BODY, -22, BOTTOM_ELBOWS);

const DOWN = 0.9;
const UP = 0.7;

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
