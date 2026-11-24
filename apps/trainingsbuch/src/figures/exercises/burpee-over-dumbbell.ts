// Lateral Burpee over the Dumbbell (CrossFit Open 24.1, 25.1): a burpee beside a dumbbell on the floor, with
// chest and thighs on the floor, then a jump with both feet sideways over the dumbbell. The next burpee is on the other
// side. The figure cannot move to the side, so the dumbbell goes under it while it is in the air. The loop has two
// repetitions: the dumbbell goes over and back.
import type { Exercise, View } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { flightHip, type Pose, type Step } from "../skeleton.ts";
import { ABSORB, LAND, RISE, STAND, TAKEOFF, TO_THE_FLOOR } from "./burpee.ts";

/** The time in the air: the hip rises 942 * AIR² / 8 = 20.8 units, so the tucked feet are high above the dumbbell. */
const AIR = 0.42;

// The legs push, the arms swing up to the front of the chest.
const TAKE: Pose = { ...TAKEOFF, grip: 14, hands: handAt(TAKEOFF.hip, TAKEOFF.lean, 40, -30) };
// The top of the jump: the knees come up, the feet are far above the dumbbell.
const apexHip = flightHip(TAKEOFF.hip, TAKEOFF.hip, AIR, 0.5);
const APEX: Pose = {
  ...TAKEOFF,
  hip: apexHip,
  lean: 4,
  feet: { x: apexHip.x + 2, y: apexHip.y + 54 },
  toes: 118,
  knees: 0.15,
  grip: 14,
  hands: handAt(apexHip, 4, 42, -26),
};
const TOUCH: Pose = { ...LAND, grip: 14, hands: handAt(LAND.hip, LAND.lean, 40, -20) };

/** One repetition: the burpee, the jump, the landing. */
const rep: Step[] = [
  ...TO_THE_FLOOR,
  { to: RISE, seconds: 0.38, label: "Sprung", ease: "in", anchor: "feet" },
  { to: TAKE, seconds: 0.11, ease: "linear", anchor: "feet" },
  { to: APEX, seconds: AIR / 2, label: "Über die Hantel", ease: "out", flight: true, legs: "fk" },
  { to: TOUCH, seconds: AIR / 2, ease: "in", flight: true, legs: "fk" },
  { to: ABSORB, seconds: 0.22, label: "Landung", ease: "out" },
  { to: STAND, seconds: 0.3, label: "Stehen", ease: "soft", anchor: "feet" },
];
const steps: Step[] = [...rep, ...rep];

/** The parts of the loop in which the dumbbell crosses: the middle 60 % of each flight. */
const total = steps.reduce((sum, step) => sum + step.seconds, 0);
const flightStart = rep
  .slice(
    0,
    rep.findIndex((step) => step.flight === true),
  )
  .reduce((sum, step) => sum + step.seconds, 0);
const repSeconds = total / 2;
const crossing = (start: number): readonly [number, number] => [
  (start + AIR * 0.2) / total,
  (start + AIR * 0.8) / total,
];

const SIDE: View = { label: "Seite", yaw: 0, box: [40, -26, 204, 238] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-70, -26, 140, 238] };

export const BURPEE_OVER_DUMBBELL: Exercise = {
  key: "burpee-over-dumbbell",
  title: "Burpee over the Dumbbell",
  // The dumbbell lies beside the feet of the figure that stands, 34 to the side: the hands on the floor are 14 to the side.
  equipment: {
    kind: "floordumbbell",
    x: STAND.hip.x,
    side: 34,
    crossings: [crossing(flightStart), crossing(repSeconds + flightStart)],
  },
  views: [SIDE, FRONT],
  start: STAND,
  steps,
};
