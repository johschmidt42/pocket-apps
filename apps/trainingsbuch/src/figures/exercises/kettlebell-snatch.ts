// Kettlebell Snatch (Hall: "20 kettlebell snatches, 10 each arm"): one kettlebell in the near hand. The bell
// swings back between the legs (the hike of `kettlebell-swing-russian.ts`), the hips drive it forward and up, the
// elbow pulls it close to the body, the hand punches through, and the arm locks out over the shoulder. The bell then
// lies on the back of the forearm. On the way down the bell falls in front of the body and swings back between the
// legs into the next repetition. The free arm hangs beside the body.
import { FRONT, SIDE, type Exercise, type View } from "../exercise.ts";
import { shoulderOf, standingHipY } from "../poses.ts";
import { BODY, up, type Pose } from "../skeleton.ts";
import { LOW, pose } from "./dumbbell-snatch.ts";

const RAD = Math.PI / 180;
/** The feet are wider than in the swing: the bell passes between the knees and does not touch them. */
const STANCE = 19;
/** The hand with the bell swings in the middle between the legs: the bell passes between the knees. */
const SWING_Z = 0;
/** Overhead, the hand is a little inside the shoulder joint (13), as in the single-arm overhead squat. */
const OVERHEAD_Z = 10;
const ARM = Math.sqrt(61.95 ** 2 - (BODY.shoulderHalf - SWING_Z) ** 2);
export const TALL = standingHipY(STANCE);

export const legs = { stance: STANCE, knees: 0.8 };

/** A pose of the swing with a straight arm: `arm` 0 points down, 90 forward, a negative angle back between the legs. */
export function swung(
  hip: { x: number; y: number },
  lean: number,
  arm: number,
  head: number,
): Pose {
  const shoulder = shoulderOf(hip, lean);
  const bell = {
    x: shoulder.x + Math.sin(arm * RAD) * ARM,
    y: shoulder.y + Math.cos(arm * RAD) * ARM,
    z: SWING_Z,
  };
  return { ...pose(hip, lean, bell, LOW, { head, elbows: 0 }), ...legs };
}

/** The locked arm over the shoulder joint, with active shoulders. */
export function locked(hip: { x: number; y: number }, lean: number): Pose {
  const shrug = 3;
  const neck = shoulderOf(hip, lean);
  const along = up(lean);
  const joint = { x: neck.x + along.x * shrug, y: neck.y + along.y * shrug };
  const reach = Math.sqrt(61.9 ** 2 - (OVERHEAD_Z - BODY.shoulderHalf) ** 2);
  return {
    ...pose(hip, lean, { x: joint.x + 1, y: joint.y - reach, z: OVERHEAD_Z }, LOW, {
      head: 2,
      elbows: 0,
      shrug,
    }),
    ...legs,
  };
}

// The hike: the hips are far back, the bell is behind the hips between the thighs.
export const HIKE = swung({ x: 58, y: 125 }, 58, -48, -18);
// The bell passes the knees.
export const PASS = swung({ x: 65, y: 122 }, 31, 6, -10);
// The hips are open, the arm is still long and points forward and down.
export const ARRIVE = swung({ x: 73.5, y: TALL + 0.03 }, 3, 40, -2);
// The elbow pulls high and to the side: the bell rises close to the body, to the chest.
const HIGH: Pose = {
  ...pose({ x: 75, y: TALL }, -2, { x: 90, y: 86, z: 12 }, LOW, {
    head: -4,
    elbows: 0.85,
    shrug: 3,
  }),
  ...legs,
};
// The hand passes the face and punches through: the bell turns over onto the back of the forearm.
const PUNCH: Pose = {
  ...pose({ x: 74, y: TALL }, 0, { x: 83, y: 38, z: 15 }, LOW, {
    head: -2,
    elbows: -0.5,
    shrug: 2,
  }),
  ...legs,
};
const TOP = locked({ x: 74, y: TALL }, 0);
// On the way down, the bell falls in front of the face and the chest.
const FALL: Pose = {
  ...pose({ x: 74, y: TALL }, 2, { x: 93, y: 72, z: 10 }, LOW, { head: -4, elbows: -0.4 }),
  ...legs,
};

export const VIEWS: [View, View] = [
  { ...SIDE, box: [16, -24, 160, 236] },
  { ...FRONT, box: [-60, -24, 120, 236] },
];

export const KETTLEBELL_SNATCH: Exercise = {
  key: "kettlebell-snatch",
  title: "Kettlebell Snatch",
  equipment: { kind: "kettlebells", hand: 0 },
  views: VIEWS,
  start: HIKE,
  steps: [
    {
      to: ARRIVE,
      via: [PASS],
      seconds: 0.45,
      label: "Hüfte strecken",
      ease: "in",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: HIGH, seconds: 0.14, label: "Zug", ease: "linear", anchor: "feet", arms: "fk" },
    { to: PUNCH, seconds: 0.11, label: "Durchstoßen", ease: "linear", anchor: "feet", arms: "fk" },
    { to: TOP, seconds: 0.16, ease: "out", anchor: "feet", arms: "fk" },
    { to: TOP, seconds: 0.4, label: "Über Kopf" },
    { to: FALL, seconds: 0.25, label: "Fallen lassen", ease: "in", anchor: "feet", arms: "fk" },
    {
      to: HIKE,
      via: [ARRIVE, PASS],
      seconds: 0.5,
      label: "Rückschwung",
      ease: "out",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: HIKE, seconds: 0.06 },
  ],
};
