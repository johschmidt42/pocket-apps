// Russian kettlebell swing: a hinge of the hips throws the bell up to the height of the eyes.
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
 * 0 points down, 90 is level and forward, a negative angle points back between the legs.
 */
function swing(hip: { x: number; y: number }, lean: number, arm: number, head: number): Pose {
  const shoulder = shoulderOf(hip, lean);
  const hands = {
    x: shoulder.x + Math.sin(arm * RAD) * ARM,
    y: shoulder.y + Math.cos(arm * RAD) * ARM,
  };
  return { ...base, hip, lean, head, hands };
}

// The back swing: the hips are far back, the back is flat, the shins are nearly vertical.
// The arms point down and back: the hands are high between the thighs, the bell is behind the hips.
const HIKE = swing({ x: 58, y: 125 }, 58, -48, -18);
// On the way: the hips are half open, the bell passes the knees. Here the bell is fastest.
const PASS = swing({ x: 65, y: 122 }, 31, 6, -10);
// The hips arrive: the body is nearly tall (lean 3), the arms are still 38 degrees below level.
const ARRIVE = swing({ x: 73.5, y: TALL + 0.03 }, 3, 52, -1);
// The float: a tall plank that leans back a little against the bell. The bell is at the height of the eyes
// (the CrossFit standard for the Russian swing): the arms are 18 degrees above level.
const FLOAT = swing({ x: 75.5, y: TALL }, -4, 108, 0);

// The bell reaches from x = 30 (back swing) to x = 162 (float).
const SIDE: View = { label: "Seite", yaw: 0, box: [16, 0, 160, 212] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, 0, 120, 212] };

export const KETTLEBELL_SWING_RUSSIAN: Exercise = {
  key: "kettlebell-swing-russian",
  title: "Russian Kettlebell Swing",
  equipment: { kind: "kettlebell" },
  views: [SIDE, FRONT],
  start: HIKE,
  // `follow: "hands"`: the time of each way is split by the way of the hands. The bell then moves like a
  // pendulum, with one smooth speed, and the hips are done early (the "snap").
  steps: [
    {
      to: FLOAT,
      via: [PASS, ARRIVE],
      seconds: 0.7,
      label: "Hüfte strecken",
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: FLOAT, seconds: 0.08, label: "Schweben" },
    {
      to: HIKE,
      via: [ARRIVE, PASS],
      seconds: 0.7,
      label: "Fallen lassen",
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: HIKE, seconds: 0.06, label: "Rückschwung" },
  ],
};
