// Row on a rowing machine. The order is the exercise: legs, body, arms, and back: arms, body, legs.
import type { Exercise, View } from "../exercise.ts";
import { ROWER } from "../machines.ts";
import { armAt, shoulderOf } from "../poses.ts";
import type { Pose } from "../skeleton.ts";

/** The x of the ankles on the foot plates. The machine goes from X - 140 to X + 97. */
const X = 160;
/** A straight arm: just inside the reach of 62. */
const ARM = 61.95;
/** With straight arms, the elbows point down and back. They then bend to the back at once when the pull starts. */
const ELBOW = -30;
/** Arms that are nearly straight (the elbow is about 29 degrees off straight): the border of "body" and "arms". */
const SOFT = 60;

const base = { feet: { x: X, y: ROWER.ankleY }, toes: ROWER.toes, grip: 12, knees: 0.15 };

/**
 * A pose with straight arms. `back` is how far the hip is behind the ankles.
 * `handY` is the height of the handle: the hands are where the arms reach this height. `arm` is the distance
 * from the shoulders to the hands.
 */
function reach(back: number, lean: number, handY: number, head: number, arm = ARM): Pose {
  const hip = { x: X - back, y: ROWER.hipY };
  const shoulder = shoulderOf(hip, lean);
  const hands = { x: shoulder.x + Math.sqrt(arm ** 2 - (handY - shoulder.y) ** 2), y: handY };
  return { ...base, hip, lean, head, hands, elbowTo: ELBOW };
}

/** With this hip place, the legs are straight, but the knees are not locked (the knee angle is about 168). */
const LONG = 77.6;

// The catch. The seat is 34 behind the heels: the shins are 2 degrees short of vertical. The torso leans 24 degrees
// forward, the arms are straight, the handle is at the height of the chain exit and 8 behind it.
const CATCH = reach(34, 24, 144, -14);
// The drive. From pose to pose, the legs do a smaller part of the way of the handle and the body a larger part:
// the parts overlap, and the seat slows down with no jerk.
// The legs are most of their way down: the torso has only started to open, the arms are straight.
const LEGS_HALF = reach(56, 22.5, 143.8, -13);
const LEGS_DOWN = reach(66, 18, 143.6, -11);
// The legs finish, the body swings.
const BODY_STARTS = reach(72.5, 10, 143.3, -6);
const BODY_UP = reach(76.5, 0, 143, -1);
// The body is back and the legs are down: the arms have just started to bend.
const BODY_BACK = reach(LONG, -8, 142.5, 3, SOFT);
// The finish: the handle is at the lower ribs, the elbows are behind the body and near it.
const FINISH_HIP = { x: X - LONG, y: ROWER.hipY };
const FINISH: Pose = {
  ...base,
  hip: FINISH_HIP,
  lean: -18,
  head: 8,
  ...armAt(FINISH_HIP, -18, -30, 90),
};
// Recovery, the arms are most of their way out (the hands are 54 from the shoulders): the torso has started to
// come forward. With less overlap here, the handle slows down at this pose and then jumps forward.
const ARMS_AWAY = reach(LONG, -6, 142.3, 3, 54);
// Recovery, the middle of the swing of the body: the arms are straight, the legs are still down.
const BODY_MID = reach(LONG, 3, 143, -2);
// Recovery, the body is over: the hands are past the knees. Only now do the knees start to come up.
const BODY_OVER = reach(77, 14, 143.4, -8);
// Recovery, the knees come up: first slowly, while the torso reaches its catch angle.
const KNEES_BREAK = reach(75.4, 17.5, 143.6, -10);
const SLIDE = reach(69.5, 21, 143.8, -12);

/**
 * A pose on the way of the arms between a pose with straight arms and the finish: `part` is 0 at `from` and 1 at
 * the finish. The handle is on the straight line between the two places. With some of these poses in a step,
 * the arms can use "fk" (a smooth elbow), and the handle still goes on a nearly straight line.
 */
function pull(from: Pose, part: number): Pose {
  const a = "x" in from.hands ? from.hands : from.hands[0];
  const b = "x" in FINISH.hands ? FINISH.hands : FINISH.hands[0];
  const mix = (p: number, q: number) => p + (q - p) * part;
  return {
    ...base,
    hip: FINISH_HIP,
    lean: mix(from.lean, FINISH.lean),
    head: mix(from.head ?? 0, 8),
    hands: { x: mix(a.x, b.x), y: mix(a.y, b.y) },
    elbowTo: ELBOW,
  };
}

const PULL_STARTS = pull(BODY_BACK, 0.35);

const SIDE: View = { label: "Seite", yaw: 0, box: [12, 66, 252, 146] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, 66, 120, 146] };

export const ROW: Exercise = {
  key: "row",
  title: "Row",
  equipment: { kind: "rower", x: X },
  views: [SIDE, FRONT],
  start: CATCH,
  // One step for the drive and one for the recovery: the handle then has one smooth speed (`follow: "hands"`).
  // The arms use "fk": straight arms keep their length while the lean changes, and the elbow starts to bend
  // with no jump. The `pull()` poses keep the handle on its line while the arms bend.
  steps: [
    // The drive is two steps, so that it can be fast at its end: "in" up to the first part of the pull, then "out".
    // The times are in the ratio of the two ways of the handle (about 91 to 27): the handle has one speed at the border.
    {
      to: PULL_STARTS,
      via: [LEGS_HALF, LEGS_DOWN, BODY_STARTS, BODY_UP, BODY_BACK],
      seconds: 0.645,
      label: ["Beine", "Beine", "Körper", "Körper", "Körper", "Arme"],
      ease: "in",
      arms: "fk",
      follow: "hands",
    },
    {
      to: FINISH,
      via: [pull(BODY_BACK, 0.7)],
      seconds: 0.195,
      label: "Arme",
      ease: "out",
      arms: "fk",
      follow: "hands",
    },
    { to: FINISH, seconds: 0.12, label: "Finish" },
    {
      to: CATCH,
      via: [
        pull(ARMS_AWAY, 0.7),
        pull(ARMS_AWAY, 0.35),
        ARMS_AWAY,
        BODY_MID,
        BODY_OVER,
        KNEES_BREAK,
        SLIDE,
      ],
      seconds: 1.5,
      label: [
        "Arme weg",
        "Arme weg",
        "Arme weg",
        "Körper vor",
        "Körper vor",
        "Beine anziehen",
        "Beine anziehen",
        "Beine anziehen",
      ],
      ease: "soft",
      arms: "fk",
      follow: "hands",
    },
  ],
};
