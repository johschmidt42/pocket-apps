// Farmers carry: a walk with a heavy dumbbell in each hand, on the spot, as on a treadmill
// (about 1.3 m/s, 130 steps per minute). One function makes a pose from the part of the loop. The loop is two steps.
// While a foot is on the ground, its contact point is on the belt, which moves back at a constant speed: the foot
// lands on the heel, is flat, and rolls over the toe. In the swing, the leg comes from two angles (thigh and knee)
// on smooth curves. There is no flight: both feet are on the ground for 12 % of the loop, twice.
import type { Equipment, Exercise, View } from "../exercise.ts";
import { onHeel } from "../poses.ts";
import { item, tiptoeFromToe, up, type Pose, type Step } from "../skeleton.ts";

const RAD = Math.PI / 180;
/** The time of one loop (two steps), in seconds. */
const LOOP = 0.92;
/** The number of poses in one loop. With 50, the landing (0, 0.5) and the toe-off (0.12, 0.62) are exactly on a pose. */
const POSES = 50;
/** The part of the loop in which one foot is on the ground. */
const STANCE = 0.62;
/** The speed of the belt, in units per second: 1.3 m/s. */
const BELT = 125;
/** The x of the hip. */
const X = 74;
/** The x of the heel at the landing, relative to `X`. */
const LAND = 21;
const THIGH = 40;
const SHIN = 40;
const LEAN = 1;
const SHRUG = -1;
/** The z of a shoulder joint. */
const SHOULDER_Z = 13;
/** The length of the arm that the poses use: just inside the reach of 62, so that the hand is exactly on its spot. */
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

/**
 * The hip. It is highest in the middle of each stance (the body goes over the straight leg) and lowest when both
 * feet are on the ground: the reverse of the run. It does not move forward or back.
 */
const hipOf = (part: number): Spot => ({ x: X, y: 122 + 1.4 * Math.cos(4 * Math.PI * part) });

/** The angle of the foot over the loop of one leg: heel first, flat, the heel rises, the toe leaves, the toes lift for the landing. */
const toesOf = periodic([
  [0, 74],
  [0.1, 90],
  [0.25, 90],
  [0.4, 96],
  [0.5, 111],
  [0.62, 148],
  [0.64, 149.5],
  [0.73, 128],
  [0.8, 105],
  [0.88, 90],
  [0.96, 78],
]);

/** The ankle of a foot on the belt. The contact point (the heel, later the toe) moves back at the speed of the belt. */
function planted(part: number): Spot {
  const heelX = X + LAND - BELT * LOOP * part;
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

// The end of the swing, as places of the ankle relative to its place at the landing: the foot swings to 3 in front of
// it, slows down, and comes back and down to it. So the foot already moves back, nearly as fast as the belt,
// when the heel lands.
const landing = planted(0);
const lates = (
  [
    [0.92, 1.5, -1.7],
    [0.94, 2.6, -1.5],
    [0.96, 2.9, -1.2],
    [0.98, 2.1, -0.7],
  ] as const
).map(([part, dx, dy]) => ({
  part,
  ...anglesTo(hipOf(part), { x: landing.x + dx, y: landing.y + dy }),
}));
const late = (field: "thigh" | "knee"): Knot[] => lates.map((e) => [e.part, e[field]]);

/** The thigh in the swing: it swings forward past the other leg, a little beyond the landing angle, and comes back. */
const thighOf = periodic([
  ...edge("thigh"),
  [0.67, -2],
  [0.73, 13],
  [0.8, 23],
  [0.88, 28.5],
  ...late("thigh"),
]);
/** The knee in the swing: it bends to about 60 degrees so that the toe clears the floor, then the leg opens. */
const kneeOf = periodic([
  ...edge("knee"),
  [0.67, 53],
  [0.73, 62],
  [0.8, 50],
  [0.88, 26],
  ...late("knee"),
]);

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
 * The hand of one side: the arm is straight and hangs from the shoulder joint, which the shrug pulls down.
 * The load swings only a little, opposite to the leg of its side: the hand is in front when the leg is back.
 */
function handOf(part: number, hip: Spot, grip: number): Spot {
  const torso = up(LEAN);
  const joint = { x: hip.x + torso.x * (46 + SHRUG), y: hip.y + torso.y * (46 + SHRUG) };
  const dx = -SWING * Math.cos(2 * Math.PI * (part - 0.04));
  // The hand is `grip - SHOULDER_Z` out to the side of the shoulder joint: the rest of the arm length is in the side view.
  const flat = Math.sqrt(ARM * ARM - (grip - SHOULDER_Z) ** 2);
  return { x: joint.x + dx, y: joint.y + Math.sqrt(flat * flat - dx * dx) };
}

/** The pose at one part of the loop. The near leg lands at 0, the far leg lands at 0.5. */
function pose(part: number, grip: number): Pose {
  const hip = hipOf(part);
  return {
    hip,
    lean: LEAN,
    head: 0,
    shrug: SHRUG,
    feet: [ankleOf(part, hip), ankleOf(part + 0.5, hip)],
    toes: [toesOf(part), toesOf(part + 0.5)],
    stance: 6,
    knees: 0.08,
    hands: [handOf(part, hip, grip), handOf(part + 0.5, hip, grip)],
    grip,
  };
}

const SIDE: View = { label: "Seite", yaw: 0, box: [4, 22, 150, 190] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, 22, 120, 190] };

/**
 * The carry with a load in each hand. `grip` is half the distance between the hands: the load must pass the thighs.
 * `farmers-carry-kettlebell.ts` is the same walk with kettlebells.
 */
export function farmersCarry(options: {
  key: string;
  title: string;
  equipment: Equipment;
  grip: number;
}): Exercise {
  const start = pose(0, options.grip);
  const steps: Step[] = [];
  for (let i = 1; i <= POSES; i++) {
    steps.push({
      to: i === POSES ? start : pose(i / POSES, options.grip),
      seconds: LOOP / POSES,
      ...(i === 1 ? { label: "Rechter Schritt" } : {}),
      ...(i === POSES / 2 + 1 ? { label: "Linker Schritt" } : {}),
      ease: "linear",
      legs: "line",
      arms: "line",
    });
  }
  return {
    key: options.key,
    title: options.title,
    equipment: options.equipment,
    views: [SIDE, FRONT],
    start,
    steps,
  };
}

export const FARMERS_CARRY: Exercise = farmersCarry({
  key: "farmers-carry",
  title: "Farmers Carry",
  equipment: { kind: "dumbbells" },
  grip: 23,
});
