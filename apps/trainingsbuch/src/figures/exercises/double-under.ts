// Double-unders: one small jump, and the rope passes under the feet two times.
import type { Exercise, View } from "../exercise.ts";
import { BODY, flightHip, GROUND, tiptoe, up, type Pose, type Step } from "../skeleton.ts";

// The time plan. One loop is one jump. The loop starts at the lowest point of the ground contact.
//
//   0.00 s  BOUNCE   the rope is over the head (phase 0)
//   0.10 s  TAKEOFF  the rope comes down in front of the body
//   0.15 s  the rope is under the feet for the first time (a quarter of the loop)
//   0.30 s  the top of the flight, the rope is over the head again
//   0.45 s  the rope is under the feet for the second time (three quarters of the loop)
//   0.50 s  LAND     the rope goes up behind the body
//
// The two passes are half a loop apart (0.30 s). The flight is 0.40 s long and has the same middle
// as the two passes. Thus the feet are in the air from 0.05 s before the first pass to 0.05 s after the second.
// A flight of 0.40 s lifts the hip 18.8 units (942 * 0.40² / 8). The speed at takeoff is 188 units/s
// (942 * 0.40 / 2). At the passes, 0.05 s after the takeoff, the feet are 8.2 units up (188 * 0.05 - 942 * 0.05² / 2).
const LOOP = 0.6;
const AIR = 0.4;
const CONTACT = LOOP - AIR;
const TAKEOFF_AT = CONTACT / 2;
const PASS_AT = LOOP / 4;

const TURNS = 2;
/** The rope is over the head at the start of the loop. */
const PHASE = 0;

/** The hip stays over this x: a little in front of the ankles, because the figure is on the balls of its feet. */
const HIP_X = 77;
const FEET_X = 73;

const shared = { stance: 6, grip: 22, knees: 0.15, elbows: -1, lean: 3, head: -3 };

// The hands keep their place relative to the shoulders in the whole loop: a little in front of the hips and
// 4 units below them. The arms are nearly straight, and the elbows stay quiet at the sides of the torso.
const HAND = { dx: 9, dy: 50.5 };
/** The wrists turn the rope: the hands go this far forward and back, in step with the rope. */
const WRIST = 2;

/** The hands at the time `at` of the loop, for a hip at the height `hipY`. */
function handsAt(at: number, hipY: number): { x: number; y: number } {
  const torso = up(shared.lean);
  const shoulder = { x: HIP_X + torso.x * BODY.torso, y: hipY + torso.y * BODY.torso };
  const angle = 2 * Math.PI * ((TURNS * at) / LOOP + PHASE);
  return { x: shoulder.x + HAND.dx + WRIST * Math.sin(angle), y: shoulder.y + HAND.dy };
}

/** The key pose at the time `at` of the loop. */
function pose(at: number, hipY: number, feet: { x: number; y: number }, toes: number): Pose {
  return { ...shared, hip: { x: HIP_X, y: hipY }, feet, toes, hands: handsAt(at, hipY) };
}

/** A straight leg, from the hip joint to the ankle. */
const LEG = 79.95;

// The lowest point of the contact: the heels are nearly down, the knees give a little.
const BOUNCE_TOES = 100;
const BOUNCE = pose(0, 118.6, tiptoe(FEET_X, BOUNCE_TOES), BOUNCE_TOES);

// Full extension on the balls of the feet. The landing is the same position.
// The push is 8.9 units long: it ends at about 2 * 8.9 / 0.10 = 178 units/s, a little less than the takeoff speed.
const TOES = 136;
const pushFeet = tiptoe(FEET_X, TOES);
const TAKEOFF = pose(TAKEOFF_AT, pushFeet.y - LEG, pushFeet, TOES);
const LAND = pose(TAKEOFF_AT + AIR, pushFeet.y - LEG, pushFeet, TOES);

/** The hip in the flight, at the time `at` of the loop: on the path that gravity gives. */
const airHip = (at: number) => flightHip(TAKEOFF.hip, LAND.hip, AIR, (at - TAKEOFF_AT) / AIR);

/** A pose in the flight. The legs stay straight and the feet keep the angle of the takeoff. */
function inAir(at: number): Pose {
  const hip = airHip(at);
  return pose(at, hip.y, { x: FEET_X, y: hip.y + LEG }, TOES);
}

/**
 * The middle of the rope is this far from the hands. At the passes, the rope is 1.5 units above the ground,
 * and the feet are 8.2 units up. On the ground, the hands are lower, and the rope would be too long.
 * But there it never points down. A real rope is like this too.
 */
const ROPE_ABOVE_GROUND = 1.5;
const RADIUS = GROUND - ROPE_ABOVE_GROUND - handsAt(PASS_AT, airHip(PASS_AT).y).y;

/** The key times in the flight: the two passes of the rope, the top, and the points between them. */
const AIR_TIMES = [0.25, 0.375, 0.5, 0.625, 0.75].map((part) => part * LOOP);

const flight: Step[] = [...AIR_TIMES, TAKEOFF_AT + AIR].map((at, index, times) => ({
  to: index < AIR_TIMES.length ? inAir(at) : LAND,
  seconds: at - (times[index - 1] ?? TAKEOFF_AT),
  label: "Flug",
  ease: "linear",
  flight: true,
  legs: "carry",
  arms: "carry",
}));

// From the side, the rope reaches 99 units in front of and behind the hands, and over the head.
// The standard boxes cut it.
const SIDE: View = { label: "Seite", yaw: 0, box: [-16, -8, 208, 220] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, -8, 120, 220] };

export const DOUBLE_UNDER: Exercise = {
  key: "double-under",
  title: "Double-Unders",
  equipment: { kind: "jumprope", turns: TURNS, phase: PHASE, radius: RADIUS },
  views: [SIDE, FRONT],
  start: BOUNCE,
  steps: [
    // "in": the legs push faster and faster. At the end, the hip has about the speed of the flight.
    {
      to: TAKEOFF,
      seconds: TAKEOFF_AT,
      label: "Absprung",
      ease: "in",
      anchor: "feet",
      arms: "carry",
    },
    ...flight,
    // "out": the ankles and the knees give way.
    {
      to: BOUNCE,
      seconds: CONTACT - TAKEOFF_AT,
      label: "Landung",
      ease: "out",
      anchor: "feet",
      arms: "carry",
    },
  ],
};
