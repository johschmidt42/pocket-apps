// Run: an easy, steady run on the spot, as on a treadmill (about 2.5 m/s, 167 steps per minute).
// One function makes a pose from the part of the loop. The loop is one stride: two steps.
// While a foot is on the ground, its toe is on the belt, which moves back at a constant speed.
// In the swing, the leg comes from two angles (thigh and knee) on smooth curves through measured values.
import type { Equipment, Exercise, View } from "../exercise.ts";
import { armAt, shoulderOf } from "../poses.ts";
import {
  GRAVITY,
  item,
  tiptoeFromToe,
  up,
  type Pair,
  type Pose,
  type Spot,
  type Step,
} from "../skeleton.ts";

const RAD = Math.PI / 180;
/** The time of one loop (one stride), in seconds. */
const LOOP = 0.72;
/** The number of poses in one loop. With 40, the toe-off (0.35) and the landing (0.5) are exactly on a pose. */
const POSES = 40;
/** The part of the loop in which one foot is on the ground. */
const STANCE = 0.35;
/** The speed of the belt, in units per second: 2.5 m/s. */
const BELT = 240;
/** The x of the hip, and of the middle of the body on the belt. */
const X = 74;
/** The x of the tip of the toe at the landing, relative to `X`. The ankle is then about 21 in front of the hip. */
const LAND = 35.5;
/** The height of the hip at the toe-off, at the landing and how much deeper it sinks in the middle of the stance. */
const HIP = { off: 119.4, land: 122.6, dip: 1.2 };
const THIGH = 40;
const SHIN = 40;

type Knot = readonly [part: number, value: number];

/**
 * A smooth curve through the knots that repeats after 1. It has no corner at a knot and no overshoot between
 * two knots (a monotone cubic curve). The parts of the knots must rise and be in the range 0 to 1.
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
 * The height of the hip. It makes one wave in each step, so two in the loop.
 * In the flight it falls with gravity. In the stance it sinks, turns in the middle and rises to the toe-off.
 */
function hipY(part: number): number {
  const step = wrap(part * 2) / 2;
  const air = (0.5 - STANCE) * LOOP;
  // The speed down at the toe-off (negative: up), so that the flight ends at the height of the landing.
  const off = (HIP.land - HIP.off) / air - 0.5 * GRAVITY * air;
  const land = off + GRAVITY * air;
  if (step >= STANCE) {
    const t = (step - STANCE) * LOOP;
    return HIP.off + off * t + 0.5 * GRAVITY * t * t;
  }
  const ground = STANCE * LOOP;
  const s = step / STANCE;
  const s2 = s * s;
  const s3 = s2 * s;
  const curve =
    (2 * s3 - 3 * s2 + 1) * HIP.land +
    (s3 - 2 * s2 + s) * ground * land +
    (-2 * s3 + 3 * s2) * HIP.off +
    (s3 - s2) * ground * off;
  return curve + HIP.dip * 16 * s2 * (1 - s) * (1 - s);
}

/** The hip brakes a little after the landing and gets faster to the toe-off: it moves 1 unit back and forward. */
const hipOf = (part: number) => ({
  x: X + 0.5 * Math.cos(4 * Math.PI * (part - 0.06)),
  y: hipY(part),
});

/** The angle of the foot over the loop of one leg: nearly flat at the landing, flat in the stance, then the heel lifts and folds up. */
const toesOf = periodic([
  [0, 97],
  [0.06, 90],
  [0.19, 90],
  [0.28, 106],
  [0.35, 135],
  [0.43, 168],
  [0.55, 212],
  [0.68, 198],
  [0.85, 122],
  [0.95, 102],
]);

/** The ankle of a foot on the belt. The tip of the toe is the contact point: it moves back at the speed of the belt. */
function planted(part: number): { x: number; y: number } {
  return tiptoeFromToe(X + LAND - BELT * LOOP * part, toesOf(part));
}

/** The angles of a leg from the hip to an ankle: where the thigh points (0 down, positive forward) and the bend of the knee. */
function anglesTo(
  hip: { x: number; y: number },
  ankle: { x: number; y: number },
): { thigh: number; knee: number } {
  const dx = ankle.x - hip.x;
  const dy = ankle.y - hip.y;
  const half = Math.acos(Math.min(Math.hypot(dx, dy) / (THIGH + SHIN), 1)) / RAD;
  return { thigh: Math.atan2(dx, dy) / RAD + half, knee: 2 * half };
}

// The swing curves start and end with the angles that the leg has on the ground. Then the foot has no jump
// in its place, and nearly none in its speed, at the toe-off and at the landing.
const EDGE = 1 / POSES;
const stanceAngles = (part: number) => anglesTo(hipOf(part), planted(part));
const edges = [0, EDGE, STANCE - EDGE, STANCE].map((part) => ({ part, ...stanceAngles(part) }));
const edge = (field: "thigh" | "knee"): Knot[] => edges.map((e) => [e.part, e[field]]);

/** The thigh in the swing: it stays back for a moment, swings forward to 42 degrees and comes back before the landing. */
const thighOf = periodic([
  ...edge("thigh"),
  [0.43, -13],
  [0.55, -1],
  [0.68, 24],
  [0.83, 40],
  [0.9, 37],
  [0.93, 35],
  [0.95, 32],
  [0.975, 28],
]);
/** The knee in the swing: the heel folds up to about 100 degrees, and the leg opens before the landing. */
const kneeOf = periodic([
  ...edge("knee"),
  [0.43, 44],
  [0.55, 90],
  [0.66, 100],
  [0.83, 62],
  [0.9, 33],
  [0.93, 27],
  [0.95, 24],
  [0.975, 20.5],
]);

/** The ankle of one leg at its part of the loop: 0 is the landing, `STANCE` is the toe-off. */
function ankleOf(part: number, hip: { x: number; y: number }): { x: number; y: number } {
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

/** How far forward an arm is: 0 is back (the leg of its side is in front), 1 is forward (the leg is back). */
const swingOf = (part: number) => (1 - Math.cos(2 * Math.PI * (part - 0.9))) / 2;

/**
 * How the hands hold a load in a run with a load (`run-plate.ts` and the others): the hands, the grip and the elbows,
 * from the hip and the lean of the pose. The arms then do not swing.
 */
export type Hold = (
  hip: { x: number; y: number },
  lean: number,
) => Pick<Pose, "hands" | "grip" | "elbowTo" | "elbowsOut" | "shrug">;

/** The pose at one part of the loop. The near leg lands at 0, the far leg lands at 0.5. */
function pose(part: number, hold?: Hold): Pose {
  const hip = hipOf(part);
  // The body leans from the ankles. A very small wave: a little more lean after each landing.
  const lean = 7 + 0.8 * Math.cos(4 * Math.PI * (part - 0.1));
  const hand = (p: number) => armAt(hip, lean, -36 + 60 * swingOf(p), 56 + 52 * swingOf(p)).hands;
  const legs: Omit<Pose, "hands"> = {
    hip,
    lean,
    head: -6,
    feet: [ankleOf(part, hip), ankleOf(part + 0.5, hip)],
    toes: [toesOf(part), toesOf(part + 0.5)],
    stance: 6,
    knees: 0.08,
  };
  if (hold !== undefined) return { ...legs, ...hold(hip, lean) };
  return { ...legs, hands: [hand(part), hand(part + 0.5)], grip: 15, elbowTo: -30 };
}

/** True if no foot is on the ground in the whole step that ends at the pose `i`. */
const inFlight = (i: number) => {
  const from = wrap(((i - 1) / POSES) * 2) / 2;
  return from >= STANCE - 1e-9;
};

/** The steps of the loop: 40 poses, one after the other. */
function stepsOf(hold?: Hold): Step[] {
  const start = pose(0, hold);
  const steps: Step[] = [];
  for (let i = 1; i <= POSES; i++) {
    steps.push({
      to: i === POSES ? start : pose(i / POSES, hold),
      seconds: LOOP / POSES,
      ...(i === 1 ? { label: "Rechter Schritt" } : {}),
      ...(i === POSES / 2 + 1 ? { label: "Linker Schritt" } : {}),
      ease: "linear",
      legs: "line",
      arms: "fk",
      ...(inFlight(i) ? { flight: true } : {}),
    });
  }
  return steps;
}

const SIDE: View = { label: "Seite", yaw: 0, box: [4, 22, 150, 190] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, 22, 120, 190] };

export const RUN: Exercise = {
  key: "run",
  title: "Run",
  equipment: { kind: "none" },
  belt: BELT * LOOP,
  views: [SIDE, FRONT],
  start: pose(0),
  steps: stepsOf(),
};

/** A run with a load in the hands: the legs and the torso of the run, the hands of `hold`. */
export function loadedRun(key: string, title: string, equipment: Equipment, hold: Hold): Exercise {
  return { ...RUN, key, title, equipment, start: pose(0, hold), steps: stepsOf(hold) };
}

/**
 * A spot in front of the torso: `below` the base of the neck along the torso, and `ahead` in front of the line of the
 * torso (the chest is 9.5 in front of it). It turns with the lean.
 */
export function inFront(
  hip: { x: number; y: number },
  lean: number,
  below: number,
  ahead: number,
): { x: number; y: number } {
  const neck = shoulderOf(hip, lean);
  const along = up(lean);
  return {
    x: neck.x - along.x * below - along.y * ahead,
    y: neck.y - along.y * below + along.x * ahead,
  };
}

/** The time of one stride of the run (two steps), in seconds, and its speed over the ground, in units per second. */
export const RUN_STRIDE = { seconds: LOOP, speed: BELT };

/**
 * The pose of the run at the part `part` of its loop (the near foot lands at 0 and 1, the far foot at 0.5), as a run
 * over the ground: the whole pose moves forward at the speed of the run, so a foot on the ground stays on its spot.
 * `start` is the x by which the pose at part 0 is moved.
 */
export function runOver(part: number, start: number): Pose {
  const p = pose(part - Math.floor(part));
  const dx = start + BELT * LOOP * part;
  const move = (s: Spot): Spot => ({ ...s, x: s.x + dx });
  const pair = (spots: Spot | Pair<Spot>): Spot | Pair<Spot> =>
    "x" in spots ? move(spots) : [move(spots[0]), move(spots[1])];
  return { ...p, hip: move(p.hip), feet: pair(p.feet), hands: pair(p.hands) };
}

/** True if no foot is on the ground at the part `part` of the loop. */
export const runInFlight = (part: number) => wrap(part * 2) / 2 >= STANCE - 1e-9;
