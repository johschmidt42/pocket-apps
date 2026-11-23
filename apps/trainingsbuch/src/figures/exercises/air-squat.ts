// Air squat: down below parallel and up again, the arms rise as a counterweight.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, SQUAT, STANDING } from "../poses.ts";
import { motion, type Pose } from "../skeleton.ts";

// The feet are at shoulder width and flat in the whole loop. The knees point out over the feet.
const base = { stance: 12, knees: 0.35 };

// With a stance of 12, the ankle is 5 units outside the hip joint. The hip is 0.2 lower, and the legs are straight.
const STAND_HIP = { x: 74, y: 120.2 };
// The arms hang straight beside the thighs: the hands are a little farther away than the arms can reach.
const STAND: Pose = {
  ...STANDING,
  ...base,
  hip: STAND_HIP,
  grip: 19,
  hands: handAt(STAND_HIP, 0, 2, 64),
};

// The hip is 8 units below the knee joint. The torso leans only as much as the balance needs: the center of
// mass is then over the feet, between the ankle and the middle of the foot.
// The arms are straight and point forward, a little above the shoulders.
const BOTTOM_HIP = { x: 56, y: 174 };
const BOTTOM_LEAN = 34;
const BOTTOM: Pose = {
  ...SQUAT,
  ...base,
  hip: BOTTOM_HIP,
  lean: BOTTOM_LEAN,
  head: -20,
  grip: 14,
  hands: handAt(BOTTOM_HIP, BOTTOM_LEAN, 64, -7),
};

// One step with the ease "inOut" stops for 0.4 s at the bottom. So each way has two steps: the first one
// gets faster ("in"), the second one gets slower ("out"). The pose between them, LOW, is on the way that the
// engine takes from STAND to BOTTOM. The speeds of the two steps are equal at this pose when their times are
// in the ratio PART : (1 - PART).
const WAY = motion(STAND, [{ to: BOTTOM, seconds: 1, ease: "linear", anchor: "feet" }]);
/** The part of the way down at which the thighs are near parallel. Below it, the phase is "Unten". */
const PART = 0.7;
// On the engine's way, the hips go back before the torso leans, and the figure falls backward. So in LOW the
// torso has most of its lean, and the hip is a little farther forward. From there to the bottom, the hips
// sink and the torso nearly keeps its angle. On the way up, the chest thus rises with the hips.
const LOW_LEAN = 28;
const LOW_FORWARD = 3;

function low(): Pose {
  const { hip, shoulder, head, arms } = WAY.at(PART).joints;
  const lowHip = { x: hip.x + LOW_FORWARD, y: hip.y };
  // The arm keeps the direction that it has on the engine's way, from the new place of the shoulders.
  const hand = arms[0].end;
  const hands = {
    ...handAt(lowHip, LOW_LEAN, hand.x - shoulder.x, hand.y - shoulder.y),
    z: hand.z,
  };
  return { ...BOTTOM, hip: lowHip, lean: LOW_LEAN, head, hands };
}

const LOW = low();

const DOWN = 1;
const UP = 0.8;

export const AIR_SQUAT: Exercise = {
  key: "air-squat",
  title: "Air Squat",
  equipment: { kind: "none" },
  // At the bottom, the hands are at x = 143, and the hips at x = 54. So the side box is 16 units farther
  // forward than `SIDE`.
  views: [{ ...SIDE, box: [30, -14, 120, 226] }, FRONT],
  start: STAND,
  steps: [
    { to: LOW, seconds: DOWN * PART, label: "Runter", ease: "in", anchor: "feet" },
    { to: BOTTOM, seconds: DOWN * (1 - PART), label: "Unten", ease: "out", anchor: "feet" },
    { to: LOW, seconds: UP * (1 - PART), label: "Unten", ease: "in", anchor: "feet" },
    { to: STAND, seconds: UP * PART, label: "Hoch", ease: "out", anchor: "feet" },
    { to: STAND, seconds: 0.6, label: "Stehen" },
  ],
};
