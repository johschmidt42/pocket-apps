// Sumo Deadlift High Pull: a wide stance, a narrow grip inside the legs. The legs and the hips extend first,
// then the shoulders shrug, then the arms pull the bar to just below the chin with the elbows high and out.
// On the way down: first the arms get long, then the shrug ends, then the hips go back (CrossFit).
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import { up, type Pose } from "../skeleton.ts";

/** Half the distance between the feet: the heels are a little outside the shoulders. */
const STANCE = 22;
/** Half the distance between the hands: inside the legs. */
const GRIP = 9;
const base = { feet: { x: 74, y: 200 }, stance: STANCE, knees: 0.9, grip: GRIP };
/** The length of a straight arm in the side view: 61.95 in space, and the hand is `13 - GRIP` inside the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - (13 - GRIP) ** 2);
/** The height of the hip when the legs are nearly straight: the feet are `STANCE - 7` outside the hip joints. */
const TALL = 200 - Math.sqrt(79.6 ** 2 - (STANCE - 7) ** 2);

/** A pose with straight arms and the bar at `bar`. The shoulders are `ahead` in front of the bar. */
function pulled(lean: number, ahead: number, bar: { x: number; y: number }, head: number): Pose {
  const torso = shoulderOf({ x: 0, y: 0 }, lean);
  const hip = {
    x: bar.x + ahead - torso.x,
    y: bar.y - Math.sqrt(REACH ** 2 - ahead ** 2) - torso.y,
  };
  return { ...base, hip, lean, head, hands: bar, elbowTo: 150, elbowsOut: 3 };
}

// The bar is on the floor, over the middle of the foot. The shoulders are a little in front of it, the chest is up.
const FLOOR = pulled(54, 1, { x: 85, y: 189 }, -28);
// Below the knees the torso nearly keeps its angle. These leans hold the knee at nearly one place (x = 78): the knees
// stay wide, and the bar passes them with no forward and back of the thigh.
const SHIN = pulled(50, 1, { x: 85.4, y: 175 }, -26);
const KNEE = pulled(42, 1, { x: 85.4, y: 161 }, -20);
const THIGH = pulled(27, -1, { x: 85.4, y: 147 }, -10);
const TALL_HIP = { x: 75, y: TALL };
/**
 * A pose on the way from `THIGH` to full extension (`t` from 0 to 1). The hip slows down to a stop at 1. The bar does
 * not wait for it: the shrug and a small bend of the arms (as at the end of the pull of a clean) keep it rising.
 */
function rising(t: number): Pose {
  const done = 1 - (1 - t) ** 2;
  const hip = {
    x: THIGH.hip.x + (TALL_HIP.x - THIGH.hip.x) * done,
    y: THIGH.hip.y + (TALL_HIP.y - THIGH.hip.y) * done,
  };
  const lean = THIGH.lean + (-3 - THIGH.lean) * done;
  const shrug = 5 * t;
  const neck = shoulderOf(hip, lean);
  const along = up(lean);
  const joint = { x: neck.x + along.x * shrug, y: neck.y + along.y * shrug };
  const barX = 85.6;
  const y = joint.y + Math.sqrt((REACH - 4 * t) ** 2 - (barX - joint.x) ** 2);
  return {
    ...base,
    hip,
    lean,
    head: -10 * (1 - done),
    shrug,
    hands: { x: barX, y },
    elbowTo: 150,
    elbowsOut: 3,
  };
}
const RISE_1 = rising(0.3);
const RISE_2 = rising(0.55);
const RISE_3 = rising(0.8);
// Hips and legs are extended, the shoulders are up, the arms start to bend.
const EXTEND = rising(1);
// The arms bend: the elbows go up and out, and the bar stays near the body.
const CHEST: Pose = {
  ...base,
  hip: TALL_HIP,
  lean: -3,
  head: 0,
  shrug: 5,
  hands: handAt(TALL_HIP, -3, 12, 14),
  elbowTo: 170,
  elbowsOut: 3.5,
};
// The bar is just below the chin. The elbows are high and out.
const TOP: Pose = {
  ...base,
  hip: TALL_HIP,
  lean: -3,
  head: 0,
  shrug: 4,
  hands: handAt(TALL_HIP, -3, 13.5, -11),
  elbowTo: 175,
  elbowsOut: 4,
};

export const SUMO_DEADLIFT_HIGH_PULL: Exercise = {
  key: "sumo-deadlift-high-pull",
  title: "Sumo Deadlift High Pull",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: FLOOR,
  steps: [
    // One step from the floor to the chin: the bar has one smooth speed, and the hip gets its time from the bar.
    {
      to: TOP,
      via: [SHIN, KNEE, THIGH, RISE_1, RISE_2, RISE_3, EXTEND, CHEST],
      seconds: 0.9,
      label: ["Zug", "Zug", "Zug", "Zug", "Zug", "Zug", "Zug", "Hochziehen", "Hochziehen"],
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: TOP, seconds: 0.14, label: "Oben" },
    // First the arms get long, then the shrug ends, then the hips go back.
    {
      to: FLOOR,
      via: [CHEST, EXTEND, RISE_3, RISE_2, RISE_1, THIGH, KNEE, SHIN],
      seconds: 1,
      label: "Ablassen",
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: FLOOR, seconds: 0.2 },
  ],
};
