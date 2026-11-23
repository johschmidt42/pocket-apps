// American kettlebell swing: a hinge of the hips throws the bell, and the arms guide it up over the head.
import type { Exercise, View } from "../exercise.ts";
import { shoulderOf, standingHipY } from "../poses.ts";
import type { Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
const STANCE = 16;
const GRIP = 2.5;
/** The length of a straight arm in the side view: 61.99 in space, and the hands are 10.5 inside the shoulder joints. */
const ARM = Math.sqrt(61.99 ** 2 - (13 - GRIP) ** 2);
/** The height of the hip of the figure that stands tall. */
const TALL = standingHipY(STANCE);

const base = { feet: { x: 74, y: 200 }, stance: STANCE, knees: 0.8, grip: GRIP };

/**
 * A pose with straight arms. `arm` is the angle of the arms in the side view:
 * 0 points down, 90 is level and forward, 180 points up, a negative angle points back between the legs.
 */
function swing(hip: { x: number; y: number }, lean: number, arm: number, head: number): Pose {
  const shoulder = shoulderOf(hip, lean);
  const hands = {
    x: shoulder.x + Math.sin(arm * RAD) * ARM,
    y: shoulder.y + Math.cos(arm * RAD) * ARM,
  };
  return { ...base, hip, lean, head, hands };
}

// The back swing, the pass and the arrival of the hips are the poses of the Russian swing.
const HIKE = swing({ x: 58, y: 125 }, 58, -48, -18);
// On the way: the hips are half open, the bell passes the knees. Here the bell is fastest.
const PASS = swing({ x: 65, y: 122 }, 31, 6, -10);
// The drive: the hips are nearly open. This pose rounds the corner of the lean before the hips arrive.
const DRIVE = swing({ x: 69.1, y: 121 }, 17, 29, -6);
// The hips arrive: the body is nearly tall, the arms are still 38 degrees below level.
const ARRIVE = swing({ x: 73.5, y: TALL + 0.03 }, 3, 52, -1);
// The arms are level: the body is tall and leans back a very little against the bell in front.
const LEVEL = swing({ x: 75.5, y: TALL }, -2, 90, 0);
// On the way up: the bell comes back over the feet, the body is vertical.
const HIGH = swing({ x: 75.5, y: TALL }, -1, 135, 0);
// The top: a tall plank. The bell, the shoulders, the hips and the ankles are on one vertical line.
const TOP = swing({ x: 75.5, y: TALL }, 0, 180, 0);

// The bell reaches from x = 30 (back swing) to x = 162 (arms level), and up to y = -24 (over the head).
const SIDE: View = { label: "Seite", yaw: 0, box: [16, -30, 160, 242] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, -30, 120, 242] };

export const KETTLEBELL_SWING_AMERICAN: Exercise = {
  key: "kettlebell-swing-american",
  title: "American Kettlebell Swing",
  equipment: { kind: "kettlebell" },
  views: [SIDE, FRONT],
  start: HIKE,
  steps: [
    {
      to: PASS,
      seconds: 0.22,
      label: "Hüfte strecken",
      ease: "in",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    {
      to: TOP,
      via: [DRIVE, ARRIVE, LEVEL, HIGH],
      seconds: 0.78,
      label: "Hochführen",
      ease: "out",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: TOP, seconds: 0.06, label: "Über Kopf" },
    {
      to: PASS,
      via: [HIGH, LEVEL, ARRIVE, DRIVE],
      seconds: 0.78,
      label: "Fallen lassen",
      ease: "in",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    {
      to: HIKE,
      seconds: 0.22,
      label: "Rückschwung",
      ease: "out",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: HIKE, seconds: 0.06, label: "Rückschwung" },
  ],
};
