// Burpee: hands to the floor, feet back, chest to the floor, push up, feet forward, jump.
import type { Exercise } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { BODY, flightHip, GROUND, tiptoeFromToe, type Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
const LEG = BODY.thigh + BODY.shin;

/** The ankles of the figure that stands. The feet come back to this spot at the end of the loop. */
const FEET_X = 150;
const FLAT = { x: FEET_X, y: GROUND - 6 };
/** The tip of the toe of the flat foot. It stays here when the heel goes up for the jump. */
const STAND_TOE_X = FEET_X + 15;
/** A hand on the floor: half the line width of the forearm above the ground. */
const HAND_Y = GROUND - 4.5;
/** The hands are on this spot from "Hände zum Boden" to "Füße vor": 32 in front of the ankles. */
const HANDS = { x: FEET_X + 32, y: HAND_Y };
/** The hands are exactly under the shoulder joints (see `push-up.ts`). */
const GRIP = BODY.shoulderHalf;
/** The ankle is exactly below the hip joint: a leg of 80 is then straight. */
const STANCE = BODY.hipHalf;

// ---------- The plank and the push-up: the body is one line that turns around the toes ----------

const TOP_TOES = 160;
const BOTTOM_TOES = 172;
/** The angle of the body line above the floor, with the shoulders at the height `y`. */
function tiltFor(shoulderY: number, toes: number): number {
  return Math.asin((tiptoeFromToe(0, toes).y - shoulderY) / (LEG + BODY.torso)) / RAD;
}
// The shoulders of the plank are 61.97 above the hands: the arms are straight, and the hands are on their spot.
const TOP_TILT = tiltFor(HAND_Y - 61.97, TOP_TOES);
/** The toes in the plank. With this value, the shoulders of the plank are exactly over the hands. */
const PLANK_TOE_X =
  HANDS.x - (tiptoeFromToe(0, TOP_TOES).x + Math.cos(TOP_TILT * RAD) * (LEG + BODY.torso));

/** The body as one straight line from the ankles to the shoulders. `tilt` is its angle above the floor. */
function line(tilt: number, toes: number) {
  const ankle = tiptoeFromToe(PLANK_TOE_X, toes);
  const along = { x: Math.cos(tilt * RAD), y: -Math.sin(tilt * RAD) };
  const hip = { x: ankle.x + along.x * LEG, y: ankle.y + along.y * LEG };
  return { ankle, hip, lean: 90 - tilt, toes };
}

type Elbows = { elbows: number; elbowsOut: number };

function onHands(b: ReturnType<typeof line>, head: number, elbows: Elbows): Pose {
  return {
    hip: b.hip,
    lean: b.lean,
    head,
    feet: b.ankle,
    toes: b.toes,
    stance: STANCE,
    knees: 0,
    hands: HANDS,
    grip: GRIP,
    ...elbows,
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The lower edge of the chest (half width 9.5) is on the floor. */
const CHEST_Y = GROUND - 9.5;
/** The tilt of a straight body line with the chest on the floor. */
const FLOOR_TILT = tiltFor(CHEST_Y, BOTTOM_TOES);
/** The part of the way down at which the "in" step ends and the "out" step starts. */
const PART = 0.6;

const PLANK = onHands(line(TOP_TILT, TOP_TOES), -8, { elbows: -1, elbowsOut: 2.5 });
const LOW = onHands(line(mix(TOP_TILT, FLOOR_TILT, PART), mix(TOP_TOES, BOTTOM_TOES, PART)), -18, {
  elbows: -1.5,
  elbowsOut: 4,
});
// The rule of the burpee: the chest and the thighs touch the floor. The ankle on its toes is 19.5 above the
// floor, so a straight line to a chest on the floor leaves the hip 6 above it. The hip goes down to the floor too.
const bottomAnkle = tiptoeFromToe(PLANK_TOE_X, BOTTOM_TOES);
const HIP_ON_FLOOR = CHEST_Y - 0.5;
const bottomHip = {
  x: bottomAnkle.x + Math.sqrt(LEG * LEG - (HIP_ON_FLOOR - bottomAnkle.y) ** 2),
  y: HIP_ON_FLOOR,
};
const BOTTOM = onHands(
  {
    ankle: bottomAnkle,
    hip: bottomHip,
    lean: 90 + Math.asin(0.5 / BODY.torso) / RAD,
    toes: BOTTOM_TOES,
  },
  -26,
  { elbows: -3, elbowsOut: 1.5 },
);

// ---------- From the feet to the hands, and back ----------

const STAND: Pose = {
  hip: { x: FEET_X, y: 120 },
  lean: 0,
  feet: FLAT,
  stance: STANCE,
  grip: 19,
  hands: handAt({ x: FEET_X, y: 120 }, 0, 2, 64),
};

// The hips go back, the torso leans, the hands reach down. The center of mass stays over the feet.
const foldHip = { x: 138, y: 140 };
const FOLD: Pose = {
  hip: foldHip,
  lean: 42,
  head: -15,
  feet: FLAT,
  stance: STANCE,
  knees: 0.4,
  grip: 16,
  hands: handAt(foldHip, 42, 12, 58),
};

// A deep squat with the hands on the floor. The arms are nearly straight and carry a part of the weight.
const crouchHip = { x: 130, y: 164 };
const CROUCH: Pose = {
  hip: crouchHip,
  lean: 62,
  head: -30,
  feet: FLAT,
  stance: STANCE,
  knees: 0.5,
  hands: HANDS,
  grip: GRIP,
  elbows: -1,
  elbowsOut: 2.5,
};

// The feet are in the air on the way back. The hips go up a little, and the shoulders come over the hands.
// The shoulders stay within 62 of the hands, or the hands leave the floor.
const KICK: Pose = {
  hip: { x: 135, y: 153 },
  lean: 74,
  head: -22,
  feet: { x: 98, y: 174 },
  toes: 125,
  stance: STANCE,
  knees: 0.2,
  hands: HANDS,
  grip: GRIP,
  elbows: -1,
  elbowsOut: 2.5,
};

// The feet are in the air on the way forward. The knees come under the body.
const TUCK: Pose = {
  hip: { x: 136, y: 153 },
  lean: 74,
  head: -22,
  feet: { x: 104, y: 176 },
  toes: 120,
  stance: STANCE,
  knees: 0.3,
  hands: HANDS,
  grip: GRIP,
  elbows: -1,
  elbowsOut: 2.5,
};
// The feet land. The hip is still 4 units above the deep squat: the legs take the landing.
const TOUCH: Pose = { ...CROUCH, hip: { x: 131, y: 160 }, lean: 64 };

// ---------- The jump ----------

/** The time in the air: the hip rises 942 * AIR² / 8 = 10.6 units. */
const AIR = 0.3;

// Most of the way up. The arms swing forward and up, and they are at the height of the shoulders.
const riseHip = { x: 148, y: 126 };
const RISE: Pose = {
  hip: riseHip,
  lean: 16,
  head: -8,
  feet: FLAT,
  stance: STANCE,
  knees: 0.3,
  grip: 14,
  hands: handAt(riseHip, 16, 56, -20),
};

const JUMP_TOES = 130;
const jumpAnkle = tiptoeFromToe(STAND_TOE_X, JUMP_TOES);
const takeoffHip = { x: jumpAnkle.x, y: jumpAnkle.y - LEG };
// Full extension, on the toes. The arms are nearly up.
const TAKEOFF: Pose = {
  hip: takeoffHip,
  lean: 2,
  feet: jumpAnkle,
  toes: JUMP_TOES,
  stance: STANCE,
  knees: 0.1,
  grip: 9,
  hands: handAt(takeoffHip, 2, 16, -61),
};
// The top of the jump. The hands meet over the head. They are 4 units beyond the reach: the arms are straight.
const apexHip = flightHip(takeoffHip, takeoffHip, AIR, 0.5);
const APEX: Pose = {
  hip: apexHip,
  lean: 0,
  feet: { x: apexHip.x, y: apexHip.y + LEG },
  toes: 150,
  stance: STANCE,
  knees: 0.1,
  grip: 3,
  hands: handAt(apexHip, 0, 2, -66),
};
// First contact, on the toes. The arms start to come down in front of the body.
const LAND: Pose = {
  hip: takeoffHip,
  lean: 2,
  feet: jumpAnkle,
  toes: JUMP_TOES,
  stance: STANCE,
  knees: 0.1,
  grip: 8,
  hands: handAt(takeoffHip, 2, 56, -22),
};
// The legs take the landing.
const absorbHip = { x: 148, y: 126 };
const ABSORB: Pose = {
  hip: absorbHip,
  lean: 10,
  head: -6,
  feet: FLAT,
  stance: STANCE,
  grip: 15,
  hands: handAt(absorbHip, 10, 44, 40),
};

export const BURPEE: Exercise = {
  key: "burpee",
  title: "Burpee",
  equipment: { kind: "none" },
  // The figure lies level (the head reaches x = 228) and jumps with the hands overhead (y = -13).
  views: [{ label: "Seite", yaw: 0, box: [40, -26, 204, 238] }],
  start: STAND,
  steps: [
    // The hip has the same speed on the two sides of each border: `2 * distance / seconds` fits.
    { to: FOLD, seconds: 0.32, label: "Hände zum Boden", ease: "in", anchor: "feet" },
    { to: CROUCH, seconds: 0.21, ease: "out", anchor: "feet" },
    // The hands carry the body: the hip moves on a straight line, and the hands keep their spot.
    // The feet get faster, then slower. With a constant speed to the plank, the knees whip when the legs get straight.
    { to: KICK, seconds: 0.26, label: "Füße zurück", ease: "in", arms: "line" },
    { to: PLANK, seconds: 0.17, ease: "out", arms: "line" },
    {
      to: LOW,
      seconds: 0.5 * PART,
      label: "Brust zum Boden",
      ease: "in",
      anchor: "feet",
      arms: "line",
    },
    { to: BOTTOM, seconds: 0.5 * (1 - PART), ease: "out", anchor: "feet", arms: "line" },
    {
      to: LOW,
      seconds: 0.5 * (1 - PART),
      label: "Hochdrücken",
      ease: "in",
      anchor: "feet",
      arms: "line",
    },
    { to: PLANK, seconds: 0.5 * PART, ease: "out", anchor: "feet", arms: "line" },
    { to: TUCK, seconds: 0.21, label: "Füße vor", ease: "in", arms: "line" },
    { to: TOUCH, seconds: 0.14, ease: "linear", arms: "line" },
    { to: CROUCH, seconds: 0.14, ease: "out", arms: "line" },
    // The legs push faster and faster. The last part and the flight have nearly the same speed of the hip.
    { to: RISE, seconds: 0.38, label: "Sprung", ease: "in", anchor: "feet" },
    { to: TAKEOFF, seconds: 0.11, ease: "linear", anchor: "feet" },
    { to: APEX, seconds: AIR / 2, ease: "linear", flight: true, legs: "carry" },
    { to: LAND, seconds: AIR / 2, ease: "linear", flight: true, legs: "carry" },
    { to: ABSORB, seconds: 0.22, label: "Landung", ease: "out" },
    { to: STAND, seconds: 0.36, label: "Stehen", ease: "soft", anchor: "feet" },
  ],
};
