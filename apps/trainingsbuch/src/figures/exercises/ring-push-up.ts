// Ring push-up: a push-up with the hands on two rings just above the floor. The body is one straight line
// that turns around the toes. At the bottom the chest comes down to the height of the rings, and the forearms are
// vertical, with the elbows back and up. At the top the arms are locked. The rings do not move.
import type { Exercise } from "../exercise.ts";
import { BODY, GROUND, type Pose } from "../skeleton.ts";
import { body, BOTTOM_TOES, GRIP, pose, tiltFor, type Elbows } from "./push-up.ts";

/**
 * The hands hold the rings 5 above the floor (a hand on the floor is at `GROUND - 4.5`): the rings hang a few cm
 * above the floor. With higher rings the shoulders go below the hands, and the forearm cannot be vertical.
 */
const HAND_Y = GROUND - 4.5 - 5;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Top: the arms are straight and vertical, 0.03 inside the reach of the arm, as in the push-up.
const TOP_TOES = 155;
const TOP_BODY = body(
  tiltFor(HAND_Y - Math.sqrt(61.97 ** 2 - (GRIP - BODY.shoulderHalf) ** 2), TOP_TOES),
  TOP_TOES,
);
/** The rings hang straight down to the hands, under the shoulders of the top pose. */
const HANDS = { x: TOP_BODY.shoulder.x, y: HAND_Y };

// Bottom: the chest (half width 9.5) is 9 above the floor, at the height of the hands. The shoulders are 9 above
// the hands: then the elbow (`elbowTo: -150`) is straight above the hand, and the forearm is vertical.
const BOTTOM_BODY = body(tiltFor(GROUND - 9.5 - 9, BOTTOM_TOES), BOTTOM_TOES);

const PART = 0.6;
const LOW_BODY = body(
  90 - mix(TOP_BODY.lean, BOTTOM_BODY.lean, PART),
  mix(TOP_TOES, BOTTOM_TOES, PART),
);

// The elbows go back and stay near the body, as in the push-up. At the bottom they are 13 out to the side (an arrow).
const TOP_ELBOWS: Elbows = { elbowTo: -100, elbowsOut: 0 };
const LOW_ELBOWS: Elbows = { elbowTo: -115, elbowsOut: 0.3 };
const BOTTOM_ELBOWS: Elbows = { elbowTo: -150, elbowsOut: 0.45 };

const onRings = (p: Pose): Pose => ({ ...p, hands: HANDS });
const TOP = onRings(pose(TOP_BODY, -8, TOP_ELBOWS));
const LOW = onRings(pose(LOW_BODY, mix(-8, -22, PART), LOW_ELBOWS));
const BOTTOM = onRings(pose(BOTTOM_BODY, -22, BOTTOM_ELBOWS));

const DOWN = 1.0;
const UP = 0.75;

export const RING_PUSH_UP: Exercise = {
  key: "ring-push-up",
  title: "Ring Push-up",
  equipment: { kind: "rings", x: HANDS.x, y: HANDS.y },
  views: [{ label: "Seite", yaw: 0, box: [8, 90, 196, 126] }],
  start: TOP,
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
