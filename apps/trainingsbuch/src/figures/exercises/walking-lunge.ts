// Walking lunge: long steps on the spot, as on a treadmill (84 units for each step, 1.3 s for each lunge).
// One function makes a pose from the part of the loop. The loop is two lunges. The far leg is half a loop later.
// While a foot is on the ground, its contact point is on the belt, which moves back at a constant speed: the foot
// lands on the heel, is flat, and stands on its toe while the knee of this leg goes down to the ground.
// In the swing, the leg comes from two angles (thigh and knee) on smooth curves. There is no flight and no stop.
import type { Equipment, Exercise, View } from "../exercise.ts";
import { onHeel } from "../poses.ts";
import { item, tiptoeFromToe, up, type Pose, type Step } from "../skeleton.ts";

const RAD = Math.PI / 180;
/** The time of one loop (two lunges), in seconds. */
const LOOP = 2.6;
/** The number of poses in one loop. With 100, the landing (0, 0.5) and the toe-off (0.75, 0.25) are exactly on a pose. */
const POSES = 100;
/** The part of the loop in which one foot is on the ground. */
const STANCE = 0.75;
/** The length of one step: the belt moves this far in one lunge. */
const STRIDE = 84;
/** The x of the hip at the landing of a heel. */
const X = 92;
/** The x of the heel at the landing, relative to `X`. The flat place of the ankle is 3 in front of it. */
const LAND = 46;
const THIGH = 40;
const SHIN = 40;
/** The z of a shoulder joint. */
const SHOULDER_Z = 13;
const GRIP = 19;
/** The length of the arm that the poses use: just inside the reach of 62. */
const ARM = 61.95;
/** How far a hand swings forward and back. */
const SWING = 3;

type Knot = readonly [part: number, value: number];
type Spot = { x: number; y: number };

/**
 * A smooth curve through the knots that repeats after 1. It has no corner at a knot and no overshoot between
 * two knots (a monotone cubic curve). The parts of the knots must rise and be in the range 0 to 1.
 * A copy from `run.ts`.
 */
function periodic(knots: Knot[]): (part: number) => number {
  const count = knots.length;
  const knot = (k: number) => item(knots, ((k % count) + count) % count);
  const x = (k: number) => knot(k)[0] + Math.floor(k / count);
  const y = (k: number) => knot(k)[1];
  const slope = (k: number) => (y(k + 1) - y(k)) / (x(k + 1) - x(k));
  const tangent = (k: number) => {
    const before = slope(k - 1);
    const after = slope(k);
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  };
  return (part) => {
    const p = part - Math.floor(part);
    let k = -1;
    while (k + 1 < count && x(k + 1) <= p) k++;
    const width = x(k + 1) - x(k);
    const t = (p - x(k)) / width;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * y(k) +
      (t3 - 2 * t2 + t) * width * tangent(k) +
      (-2 * t3 + 3 * t2) * y(k + 1) +
      (t3 - t2) * width * tangent(k + 1)
    );
  };
}

const wrap = (part: number) => part - Math.floor(part);

// The body, over one lunge (`h` is 0 to 1: half a loop). The moments: the heel lands (0), the back knee is on the
// ground (0.27), the body rises over the front foot (0.5), the top with a straight leg (0.72), the next heel lands (1).

/** The height of the hip. 158.75 puts the knee joint of the back leg at y = 198.5: its drawn edge touches the ground. */
const hipYOf = periodic([
  [0, 138],
  [0.27, 158.75],
  [0.5, 134],
  [0.72, 120.1],
]);
/**
 * How far the hip is behind `X`. On the belt, the body is not at a constant place: it goes down nearly on the
 * spot, rises over the front foot, and falls forward into the next step.
 */
const hipXOf = periodic([
  [0, 0],
  [0.27, -13.68],
  [0.5, -12.6],
  [0.72, -11.48],
]);
const leanOf = periodic([
  [0, 3],
  [0.27, 4],
  [0.5, 6],
  [0.72, 1],
]);

const hipOf = (part: number): Spot => ({ x: X + hipXOf(part * 2), y: hipYOf(part * 2) });

/**
 * The angle of the foot over the loop of one leg: heel first, flat as the front foot of the lunge (to 0.42), then
 * the heel rises, the foot stands on its toe as the back foot (0.635: the bottom), the toe leaves (0.75), the swing.
 */
const toesOf = periodic([
  [0, 78],
  [0.04, 90],
  [0.43, 90],
  [0.5, 106],
  [0.635, 150],
  [0.75, 150],
  [0.8, 136],
  [0.86, 110],
  [0.93, 92],
  [0.98, 80],
]);

/** The ankle of a foot on the belt. The contact point (the heel, later the toe) moves back at the speed of the belt. */
function planted(part: number): Spot {
  const heelX = X + LAND - 2 * STRIDE * part;
  const toes = toesOf(part);
  return toes < 90 ? onHeel(heelX, toes) : tiptoeFromToe(heelX + 18, toes);
}

/** The angles of a leg from the hip to an ankle: where the thigh points (0 down, positive forward) and the bend of the knee. */
function anglesTo(hip: Spot, ankle: Spot): { thigh: number; knee: number } {
  const dx = ankle.x - hip.x;
  const dy = ankle.y - hip.y;
  const half = Math.acos(Math.min(Math.hypot(dx, dy) / (THIGH + SHIN), 1)) / RAD;
  return { thigh: Math.atan2(dx, dy) / RAD + half, knee: 2 * half };
}

// The swing curves start and end with the angles that the leg has on the belt. Then the foot has no jump
// in its place, and nearly none in its speed, at the toe-off and at the landing.
const EDGE = 1 / POSES;
const stanceAngles = (part: number) => anglesTo(hipOf(part), planted(part));
const edges = [0, EDGE, STANCE - EDGE, STANCE].map((part) => ({ part, ...stanceAngles(part) }));
const edge = (field: "thigh" | "knee"): Knot[] => edges.map((e) => [e.part, e[field]]);

// The swing, as places of the ankle relative to the hip (`dx` forward, `dy` down). The foot comes forward close
// beside the standing leg and passes it at the top (0.86).
const mids = (
  [
    [0.78, -48, 53],
    [0.81, -32, 59],
    [0.84, -14, 65],
    [0.87, 6, 69],
    [0.9, 24, 68],
    [0.93, 37, 65],
  ] as const
).map(([part, dx, dy]) => {
  const hip = hipOf(part);
  return { part, ...anglesTo(hip, { x: hip.x + dx, y: hip.y + dy }) };
});
// The end of the swing, as places of the ankle relative to its place at the landing: the foot swings a little
// beyond it, slows down, and comes back and down to it. So the foot already moves back when the heel lands.
const landing = planted(0);
const lates = (
  [
    [0.96, -6, -6.5],
    [0.975, -0.5, -3.4],
    [0.99, 0.6, -1.2],
  ] as const
).map(([part, dx, dy]) => ({
  part,
  ...anglesTo(hipOf(part), { x: landing.x + dx, y: landing.y + dy }),
}));
const swing = (field: "thigh" | "knee"): Knot[] =>
  [...mids, ...lates].map((e) => [e.part, e[field]]);

const thighOf = periodic([...edge("thigh"), ...swing("thigh")]);
const kneeOf = periodic([...edge("knee"), ...swing("knee")]);

/** The ankle of one leg at its part of the loop: 0 is the landing of the heel, `STANCE` is the toe-off. */
function ankleOf(part: number, hip: Spot): Spot {
  const p = wrap(part);
  // 1e-9: the pose at the toe-off is still a pose on the ground.
  if (p <= STANCE + 1e-9) return planted(p);
  const thigh = thighOf(p) * RAD;
  const shin = (thighOf(p) - kneeOf(p)) * RAD;
  return {
    x: hip.x + THIGH * Math.sin(thigh) + SHIN * Math.sin(shin),
    y: hip.y + THIGH * Math.cos(thigh) + SHIN * Math.cos(shin),
  };
}

/**
 * The hand of one side: the arm is straight and hangs from the shoulder joint. It swings a little, opposite to
 * the leg of its side: the hand is in front when the leg is back.
 */
export function handOf(part: number, hip: Spot, lean: number): Spot {
  const torso = up(lean);
  const joint = { x: hip.x + torso.x * 46, y: hip.y + torso.y * 46 };
  const dx = 4 - SWING * Math.cos(2 * Math.PI * (part - 0.12));
  // The hand is `GRIP - SHOULDER_Z` out to the side of the shoulder joint: the rest of the arm length is in the side view.
  const flat = Math.sqrt(ARM * ARM - (GRIP - SHOULDER_Z) ** 2);
  return { x: joint.x + dx, y: joint.y + Math.sqrt(flat * flat - dx * dx) };
}

/** What the upper body does at one part of the loop. The overhead lunges hold a load with it. */
export type Upper = (
  part: number,
  hip: Spot,
  lean: number,
) => Pick<Pose, "hands" | "grip"> &
  Partial<Pick<Pose, "head" | "shrug" | "elbows" | "elbowsOut" | "elbowTo">>;

/** The arms hang beside the body and swing a little. */
export const hangingArms: Upper = (part, hip, lean) => ({
  hands: [handOf(part, hip, lean), handOf(part + 0.5, hip, lean)],
  grip: GRIP,
  elbows: -0.2,
});

/** The pose at one part of the loop. The near leg lands at 0, the far leg lands at 0.5. */
function pose(part: number, upper: Upper): Pose {
  const hip = hipOf(part);
  const lean = leanOf(part * 2);
  return {
    hip,
    lean,
    head: -2,
    feet: [ankleOf(part, hip), ankleOf(part + 0.5, hip)],
    toes: [toesOf(part), toesOf(part + 0.5)],
    stance: 7,
    knees: 0.06,
    ...upper(part, hip, lean),
  };
}

const SIDE: View = { label: "Seite", yaw: 0, box: [14, 22, 170, 190] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, 22, 120, 190] };

/** A walking lunge. The legs are the same in each form. `upper` sets the arms and the load. */
export function lunge(options: {
  key: string;
  title: string;
  equipment: Equipment;
  upper: Upper;
  views?: Exercise["views"];
}): Exercise {
  const start = pose(0, options.upper);
  const steps: Step[] = [];
  for (let i = 1; i <= POSES; i++) {
    steps.push({
      to: i === POSES ? start : pose(i / POSES, options.upper),
      seconds: LOOP / POSES,
      ...(i === 1 ? { label: "Rechter Ausfallschritt" } : {}),
      ...(i === POSES / 2 + 1 ? { label: "Linker Ausfallschritt" } : {}),
      ease: "linear",
      legs: "line",
      arms: "line",
    });
  }
  return {
    key: options.key,
    title: options.title,
    equipment: options.equipment,
    belt: 2 * STRIDE,
    views: options.views ?? [SIDE, FRONT],
    start,
    steps,
  };
}

export const WALKING_LUNGE: Exercise = lunge({
  key: "walking-lunge",
  title: "Walking Lunge",
  equipment: { kind: "none" },
  upper: hangingArms,
});
