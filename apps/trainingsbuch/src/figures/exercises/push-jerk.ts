// Push Jerk: from the front rack, dip and drive. The bar leaves the shoulders, and the body drops under it into
// a short squat on locked arms. Then the legs stand up. The feet stay side by side, unlike the split jerk.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import { tiptoe, up, type Pose } from "../skeleton.ts";
import { DIP, OVERHEAD, PASS, RACK } from "./clean-and-jerk.ts";

const base = { feet: { x: 74, y: 200 }, stance: 10, knees: 0.5, grip: 16 };
/** The length of a straight arm in the side view, with the hand 3 outside the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - 3 ** 2);
const SHRUG = 3;

/** The hand of a locked arm, `dx` in front of the shoulder joint. */
function locked(hip: { x: number; y: number }, lean: number, dx: number) {
  const neck = shoulderOf(hip, lean);
  const along = up(lean);
  const joint = { x: neck.x + along.x * SHRUG, y: neck.y + along.y * SHRUG };
  return { x: joint.x + dx, y: joint.y - Math.sqrt(REACH ** 2 - dx ** 2) };
}

// Full extension, on the toes. The bar has left the shoulders and passes the face: the head is back.
const extendHip = { x: 75, y: 116 };
const EXTEND: Pose = {
  ...base,
  feet: tiptoe(75, 118),
  toes: 118,
  hip: extendHip,
  lean: -1,
  head: -26,
  hands: handAt(extendHip, -1, 6, -19),
  elbowTo: 60,
};
// The feet are just above the floor, the body drops, and the arms push the bar higher.
const pushHip = { x: 74.2, y: 125 };
const PUSH: Pose = {
  ...base,
  feet: { x: 74.6, y: 195.2 },
  toes: 106,
  hip: pushHip,
  lean: 1,
  head: -24,
  hands: handAt(pushHip, 1, 11, -40),
  elbowTo: 75,
  elbowsOut: 2,
};
// The catch: a short squat, the arms are locked, and the head comes forward between them.
const catchHip = { x: 71, y: 134 };
const CATCH: Pose = {
  ...base,
  hip: catchHip,
  lean: 6,
  head: 2,
  hands: locked(catchHip, 6, -1),
  shrug: SHRUG,
  elbowTo: 85,
  elbowsOut: 3,
};

export const PUSH_JERK: Exercise = {
  key: "push-jerk",
  title: "Push Jerk",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: RACK,
  steps: [
    { to: RACK, seconds: 0.3, label: "Front Rack" },
    { to: DIP, seconds: 0.25, label: "Dip", anchor: "feet", arms: "carry" },
    { to: EXTEND, seconds: 0.15, label: "Ausstoßen", ease: "in", anchor: "feet", arms: "carry" },
    {
      to: CATCH,
      via: [PUSH],
      seconds: 0.27,
      label: "Unter die Stange",
      ease: "out",
      arms: "line",
      follow: "hands",
    },
    { to: CATCH, seconds: 0.14, label: "Fangen" },
    { to: OVERHEAD, seconds: 0.42, label: "Aufstehen", anchor: "feet", arms: "carry" },
    { to: OVERHEAD, seconds: 0.35, label: "Halten" },
    {
      to: RACK,
      via: [PASS],
      seconds: 0.45,
      label: "Ablassen",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
  ],
};
