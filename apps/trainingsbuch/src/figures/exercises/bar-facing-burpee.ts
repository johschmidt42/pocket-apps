// Bar-facing Burpee: a burpee in front of a barbell on the floor, the body at a right angle to the bar and
// the eyes on it. Then a jump with both feet over the bar, a landing on both feet, and a turn to face the bar again.
// The way to the floor and back is the burpee. The steps are one repetition: `runOf()` plays it to and fro over the bar.
import type { Exercise, View } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { flightHip, tiptoe, tiptoeFromToe, type Pose, type Step } from "../skeleton.ts";
import { floorSteps, standAt } from "./burpee.ts";

/** The ankles of the figure that stands, before the bar. The hands go to the floor 14 in front of them. */
const NEAR = 168;
/** The bar. The figure lies in front of it: the head and the hands do not touch the plate. */
const BAR = 236;
/** The ankles of the figure that stands after the jump: as far behind the bar as it stood before it. */
const FAR = 2 * BAR - NEAR;
const STAND = standAt(NEAR);

const RAD = Math.PI / 180;
const base = { stance: 7, grip: 15 };

// The legs push, the arms swing forward. The hips move toward the bar.
const riseHip = { x: NEAR + 2, y: 130 };
const RISE: Pose = {
  ...base,
  hip: riseHip,
  lean: 22,
  head: -12,
  feet: { x: NEAR, y: 200 },
  knees: 0.3,
  hands: handAt(riseHip, 22, 54, -14),
};

// The takeoff: on the toes, the straight body leans toward the bar.
const TAKE_TOES = 128;
const takeAnkle = tiptoeFromToe(NEAR + 15, TAKE_TOES);
// The leg is not fully straight yet (78.6 of 80): the hip still has its speed when the feet leave the floor.
const takeHip = {
  x: takeAnkle.x + 78.6 * Math.sin(14 * RAD),
  y: takeAnkle.y - 78.6 * Math.cos(14 * RAD),
};
const TAKEOFF: Pose = {
  ...base,
  hip: takeHip,
  lean: 14,
  head: -8,
  feet: takeAnkle,
  toes: TAKE_TOES,
  knees: 0.1,
  hands: handAt(takeHip, 14, 52, -34),
};

// The first touch after the flight, on the toes, with the knees a little bent.
const LAND_TOES = 118;
const landAnkle = tiptoe(FAR, LAND_TOES);
const landHip = { x: FAR - 7, y: 127 };

/** The time in the air. */
const AIR = 0.48;

/** The ankle of a leg in the air, from the angle of the thigh and the bend of the knee. */
const footFrom = (hip: { x: number; y: number }, thigh: number, knee: number) => ({
  x: hip.x + 40 * Math.sin(thigh * RAD) + 40 * Math.sin((thigh - knee) * RAD),
  y: hip.y + 40 * Math.cos(thigh * RAD) + 40 * Math.cos((thigh - knee) * RAD),
});
/** A pose in the air, at the part `t` of the flight. */
function inAir(
  t: number,
  thigh: number,
  knee: number,
  toes: number,
  lean: number,
  handX: number,
  handY: number,
): Pose {
  const hip = flightHip(takeHip, landHip, AIR, t);
  return {
    ...base,
    hip,
    lean,
    head: -6,
    feet: footFrom(hip, thigh, knee),
    toes,
    knees: 0.15,
    hands: handAt(hip, lean, handX, handY),
  };
}
// The heels come up first, so that the feet are high before they reach the bar. At the top, the knees are drawn up.
// Then the legs open for the landing.
const TUCK = inAir(0.25, 35, 85, 140, 13, 54, -20);
const APEX = inAir(0.5, 62, 98, 120, 12, 54, -8);
const OPEN = inAir(0.75, 46, 56, 112, 12, 52, 6);

const LAND: Pose = {
  ...base,
  hip: landHip,
  lean: 12,
  head: -6,
  feet: landAnkle,
  toes: LAND_TOES,
  knees: 0.2,
  hands: handAt(landHip, 12, 50, 18),
};

// The legs take the landing.
const absorbHip = { x: FAR - 15, y: 148 };
const ABSORB: Pose = {
  ...base,
  hip: absorbHip,
  lean: 30,
  head: -18,
  feet: { x: FAR, y: 200 },
  knees: 0.4,
  hands: handAt(absorbHip, 30, 34, 50),
};

/** The stand on the far side of the bar: the same pose as the start. */
const STAND_FAR = standAt(FAR);

const SIDE: View = { label: "Seite", yaw: 0, box: [56, -12, 360, 224] };

const steps: Step[] = [
  ...floorSteps(NEAR, 26),
  { to: RISE, seconds: 0.34, label: "Sprung", ease: "in", anchor: "feet" },
  { to: TAKEOFF, seconds: 0.09, ease: "linear", anchor: "feet" },
  {
    to: TUCK,
    seconds: AIR / 4,
    label: "Über die Stange",
    ease: "linear",
    flight: true,
    legs: "fk",
  },
  { to: APEX, seconds: AIR / 4, ease: "linear", flight: true, legs: "fk" },
  { to: OPEN, seconds: AIR / 4, ease: "linear", flight: true, legs: "fk" },
  { to: LAND, seconds: AIR / 4, ease: "linear", flight: true, legs: "fk" },
  { to: ABSORB, seconds: 0.22, label: "Landung", ease: "out" },
  { to: STAND_FAR, seconds: 0.4, label: "Aufrichten", ease: "soft", anchor: "feet" },
  {
    to: STAND,
    seconds: 0.45,
    label: "Drehen",
    ease: "linear",
    turn: true,
    legs: "carry",
    arms: "carry",
  },
];

export const BAR_FACING_BURPEE: Exercise = {
  key: "bar-facing-burpee",
  title: "Bar-facing Burpee",
  equipment: { kind: "floorbar", x: BAR },
  views: [SIDE],
  turnAxis: BAR,
  start: STAND,
  steps,
};
