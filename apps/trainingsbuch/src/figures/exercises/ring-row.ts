// Ring row: the body is one straight line from the heels to the head, the heels stay on the floor, and the
// figure hangs back from the rings. It pulls the chest up to the rings and lowers itself until the arms are straight.
// The body turns around the heels. The straps hang straight down, so the rings stay on one spot.
import type { Exercise } from "../exercise.ts";
import { onHeel } from "../poses.ts";
import { BODY, type Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
/** A leg that aims a little inside its reach (80) is straight. */
const LEG = 79.9;
/** The angle of the feet: the heels are on the floor, the toes point up and a little forward. */
const TOES = 35;
const ANKLE = onHeel(150, TOES);
const GRIP = 20;
/**
 * The straight arm in the side view: the hand is `GRIP - 13` farther out than the shoulder joint. 62.1 aims a hair
 * beyond the reach (62): the elbow is then 178 degrees, and the hand is 0.05 from its spot.
 */
const ARM = Math.sqrt(62.1 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);

/** The body as one line from the ankle, `tilt` degrees above the floor, toward the head (-x). */
function line(tilt: number) {
  const back = { x: -Math.cos(tilt * RAD), y: -Math.sin(tilt * RAD) };
  const hip = { x: ANKLE.x + back.x * LEG, y: ANKLE.y + back.y * LEG };
  const shoulder = { x: hip.x + back.x * BODY.torso, y: hip.y + back.y * BODY.torso };
  // The front of the body (the chest) faces up and toward the feet.
  const front = { x: -back.y, y: back.x };
  return { hip, shoulder, back, front, lean: -(90 - tilt) };
}

// Top: the body is 42 degrees above the floor. The hands are at the chest: 10 from the shoulders toward the feet
// and 13 out from the line of the body (the chest is 9.5 thick to each side).
const TOP_TILT = 42;
const top = line(TOP_TILT);
const HANDS = {
  x: top.shoulder.x - top.back.x * 10 + top.front.x * 13,
  y: top.shoulder.y - top.back.y * 10 + top.front.y * 13,
};

/**
 * Bottom: the shoulders are where the straight arm reaches the circle on which they turn around the ankle. Of the
 * two points, the lower one.
 */
function bottomTilt(): number {
  const R = LEG + BODY.torso;
  const dx = HANDS.x - ANKLE.x;
  const dy = HANDS.y - ANKLE.y;
  const d = Math.hypot(dx, dy);
  const a = (R * R - ARM * ARM + d * d) / (2 * d);
  const h = Math.sqrt(R * R - a * a);
  const base = { x: ANKLE.x + (dx / d) * a, y: ANKLE.y + (dy / d) * a };
  const shoulder = { x: base.x + (dy / d) * h, y: base.y - (dx / d) * h };
  return Math.atan2(ANKLE.y - shoulder.y, ANKLE.x - shoulder.x) / RAD;
}
// 0.05 degrees less: the arm is then a hair inside its reach, so that the hand is exactly on its spot.
const BOTTOM_TILT = bottomTilt() + 0.05;

function pose(tilt: number, elbows: { elbowTo: number; elbowsOut: number }): Pose {
  const body = line(tilt);
  return {
    hip: body.hip,
    lean: body.lean,
    head: 0,
    feet: ANKLE,
    toes: TOES,
    // The ankle is exactly behind the hip joint: the leg is straight.
    stance: BODY.hipHalf,
    knees: 0,
    hands: HANDS,
    grip: GRIP,
    ...elbows,
  };
}

const BOTTOM = pose(BOTTOM_TILT, { elbowTo: 20, elbowsOut: 0.3 });
const TOP = pose(TOP_TILT, { elbowTo: 20, elbowsOut: 0.6 });

export const RING_ROW: Exercise = {
  key: "ring-row",
  title: "Ring Row",
  equipment: { kind: "rings", x: HANDS.x, y: HANDS.y },
  views: [{ label: "Seite", yaw: 0, box: [-22, 20, 200, 196] }],
  start: BOTTOM,
  // `anchor: "feet"`: the straight body turns around the ankles. The hands keep their spot (`arms: "line"`).
  steps: [
    { to: BOTTOM, seconds: 0.25, label: "Hängen", arms: "line" },
    { to: TOP, seconds: 0.8, label: "Ziehen", ease: "soft", anchor: "feet", arms: "line" },
    { to: TOP, seconds: 0.2, label: "Brust an die Ringe", arms: "line" },
    { to: BOTTOM, seconds: 1.0, label: "Ablassen", ease: "soft", anchor: "feet", arms: "line" },
  ],
};
