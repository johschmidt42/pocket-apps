// The skeleton of the exercise figure in 3D, and the engine that moves it.
//
// Axes: x points forward (the figure looks to +x), y points down (as in SVG), z points to the
// side. Side 0 is the side at +z, side 1 is the side at -z. A pose gives only where the hip, the
// feet and the hands are. The solver computes the knees and the elbows. `figure.tsx` then
// projects the 3D joints to a flat view. See "Exercise animations" in docs/decisions.md.

export type Vec = { x: number; y: number; z: number };
export type Pair<T> = readonly [T, T];
type Side = 0 | 1;

export const GROUND = 206;
/** The ankle of a flat foot is this far above the ground. */
export const ANKLE = 6;

/** The figure is 168 units tall. 96 units are 1 m. */
export const BODY = {
  thigh: 40,
  shin: 40,
  torso: 46,
  /** The arm goes to the middle of the hand, where it grips. */
  upperArm: 30,
  forearm: 32,
  /** From the center of the pelvis to one hip joint. */
  hipHalf: 7,
  /** From the center of the shoulders to one shoulder joint. */
  shoulderHalf: 13,
  /** From the center of the shoulders to the center of the head. */
  neck: 25,
};

/** A place in a pose. `z` is the distance to the side. Without `z`, the stance or the grip gives it. */
export type Spot = { x: number; y: number; z?: number };

export type Pose = {
  /** The center of the pelvis. */
  hip: { x: number; y: number };
  /** How far the torso leans forward, in degrees. 0 is upright. */
  lean: number;
  /** How far the head tilts forward relative to the torso, in degrees. */
  head?: number;
  /** The ankles. One spot: both feet are side by side. */
  feet: Spot | Pair<Spot>;
  /** Half the distance between the feet. */
  stance?: number;
  /** The angle of each foot: 90 is flat, 150 is on the toes. */
  toes?: number | Pair<number>;
  /** The hands. One spot: both hands are side by side. */
  hands: Spot | Pair<Spot>;
  /** Half the distance between the hands. */
  grip?: number;
  /** How far the knees point to the side: 0 is straight forward. */
  knees?: number;
  /** Where the elbows point when the arms bend: 0.25 is down and a little forward, -1 is down and back. */
  elbows?: number;
  /** How much the torso bends, in degrees. Positive is round (hollow), negative is an arch. */
  bend?: number;
  /** How far the shoulder joints rise toward the head, in units along the torso. */
  shrug?: number;
  /** Where the elbows point as an angle in the side view: 0 is down, 90 forward, 180 up. Replaces `elbows`. */
  elbowTo?: number;
  /** How far the elbows point to the side: 0.35 is near the body, 1 is about 45 degrees, 3 is wide. */
  elbowsOut?: number;
};

export type Limb = { root: Vec; mid: Vec; end: Vec };

export type Joints = {
  hip: Vec;
  shoulder: Vec;
  lean: number;
  bend: number;
  /** The middle of the torso. With a bend, it is beside the line from the hip to the shoulders. */
  waist: Vec;
  shrug: number;
  head: number;
  legs: Pair<Limb>;
  arms: Pair<Limb>;
  toes: Pair<number>;
};

/**
 * How a limb moves between two key poses.
 * - "line": the foot or hand moves on a straight line.
 * - "fk": the bones turn from their old direction to the new one.
 * - "carry": the foot or hand keeps its place relative to the hip or shoulder.
 */
export type Mode = "line" | "fk" | "carry";

/** How the speed changes in a step. "inOut" and "soft" start and end slowly. */
export type EaseName = "linear" | "inOut" | "soft" | "in" | "out";

export type Step = {
  to: Pose;
  seconds: number;
  /** The name of the phase. The prototype shows it. The app does not show it yet. */
  label?: string | readonly string[];
  ease?: EaseName;
  /** Poses on the way to `to`. The figure goes through them with no stop. */
  via?: readonly Pose[];
  /** Which part sets the split of the time over the `via` poses. Without it, the way of the hip does. */
  follow?: "hands" | "feet";
  /** "feet": the leg bones carry the hip. "hands": the body hangs from the hands or stands on them. */
  anchor?: "feet" | "hands";
  /** True: the figure is in the air. The hip moves at a constant speed and falls with gravity. */
  flight?: boolean;
  /**
   * The ball is in the air in this step (wall ball). It flies with gravity to this point and falls
   * back into the hands by the end of the last step in a row with `throw`.
   */
  throw?: { x: number; y: number };
  legs?: Mode | Pair<Mode>;
  arms?: Mode | Pair<Mode>;
};

/** One moment of a loop. `thrown` is the center of the ball while it is in the air. */
export type Frame = { joints: Joints; progress: number; thrown?: Vec };

export type Motion = {
  /** The length of one loop, in seconds. */
  total: number;
  at: (seconds: number) => Frame;
};

/** Gravity: 9.81 m/s², in units of the figure (96 units are 1 m). */
export const GRAVITY = 942;

/** The hip in the air between takeoff and landing. `t` is the part of the flight that is over. */
export function flightHip(
  from: { x: number; y: number },
  to: { x: number; y: number },
  seconds: number,
  t: number,
) {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t - 0.5 * GRAVITY * seconds * seconds * t * (1 - t),
  };
}

const RAD = Math.PI / 180;
export const SIDES = [0, 1] as const;
const sign = (side: Side) => (side === 0 ? 1 : -1);

export const vec = (x: number, y: number, z = 0): Vec => ({ x, y, z });
const add = (a: Vec, b: Vec): Vec => vec(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a: Vec, b: Vec): Vec => vec(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a: Vec, k: number): Vec => vec(a.x * k, a.y * k, a.z * k);
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y + a.z * b.z;
const size = (a: Vec): number => Math.hypot(a.x, a.y, a.z);
const unit = (a: Vec): Vec => mul(a, 1 / (size(a) || 1));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mixVec = (a: Vec, b: Vec, t: number): Vec =>
  vec(mix(a.x, b.x, t), mix(a.y, b.y, t), mix(a.z, b.z, t));
const direction = (from: Vec, to: Vec): Vec => unit(sub(to, from));

/** The item at an index that the code knows to exist. */
function item<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new RangeError(`No item at index ${String(index)}`);
  return value;
}

/** The direction of the torso: 0 degrees points up, a positive angle leans forward. */
export function up(degrees: number): Vec {
  return vec(Math.sin(degrees * RAD), -Math.cos(degrees * RAD), 0);
}

/** Turns a direction to another one on the shortest arc. */
function slerp(a: Vec, b: Vec, t: number): Vec {
  const cos = Math.min(Math.max(dot(a, b), -1), 1);
  if (cos > 0.9995) return unit(mixVec(a, b, t));
  const angle = Math.acos(cos);
  const sin = Math.sin(angle);
  return add(mul(a, Math.sin((1 - t) * angle) / sin), mul(b, Math.sin(t * angle) / sin));
}

/** Two bones from `root` to `target`. The joint between them bends toward the fixed `pole`. */
function reach(root: Vec, target: Vec, first: number, second: number, pole: Vec): Limb {
  const line = sub(target, root);
  const distance = Math.min(
    Math.max(size(line), Math.abs(first - second) + 0.01),
    first + second - 0.01,
  );
  const along = unit(line);
  const across = sub(pole, mul(along, dot(pole, along)));
  const side = unit(size(across) < 0.001 ? vec(1, 0, 0) : across);
  const cos = (first * first + distance * distance - second * second) / (2 * first * distance);
  const mid = add(root, add(mul(along, first * cos), mul(side, first * Math.sqrt(1 - cos * cos))));
  return { root, mid, end: add(root, mul(along, distance)) };
}

/** Below this part of "down" in the direction from the hip to the foot, the knee pole turns with the leg. */
const KNEE_FLOOR = 0.3;

/** Where the knee points: toward the front of the leg, also when the foot is above the hip. */
function kneePole(side: Side, out: number, hip: Vec, foot: Vec): Vec {
  const flat = Math.hypot(foot.x - hip.x, foot.y - hip.y);
  if (flat < 0.001) return vec(1, 0, sign(side) * out);
  const along = { x: (foot.x - hip.x) / flat, y: (foot.y - hip.y) / flat };
  if (along.y >= KNEE_FLOOR) return vec(1, 0, sign(side) * out);
  return vec(along.y * KNEE_FLOOR, -along.x * KNEE_FLOOR, sign(side) * out);
}

type Elbow = { x: number; y: number };

const DEFAULT_KNEES = 0.3;
const DEFAULT_ELBOWS_OUT = 0.35;

const elbowPole = (side: Side, elbow: Elbow, out: number): Vec =>
  vec(elbow.x, elbow.y, sign(side) * out);
const elbowOf = (pose: Pose): Elbow =>
  pose.elbowTo === undefined
    ? { x: pose.elbows ?? 0.25, y: 1 }
    : { x: Math.sin(pose.elbowTo * RAD), y: Math.cos(pose.elbowTo * RAD) };

const hipJoint = (hip: Vec, side: Side): Vec => add(hip, vec(0, 0, sign(side) * BODY.hipHalf));
const shoulderJoint = (shoulder: Vec, side: Side): Vec =>
  add(shoulder, vec(0, 0, sign(side) * BODY.shoulderHalf));

/** How far a shrug moves the shoulder joints: along the upper half of the torso. */
export const shrugOf = (joints: { lean: number; bend: number; shrug: number }): Vec =>
  mul(up(joints.lean + joints.bend / 2), joints.shrug);

/** The middle of the torso: behind the line from hip to shoulders for a round back, in front for an arch. */
function waistOf(hip: Vec, shoulder: Vec, bend: number): Vec {
  const along = sub(shoulder, hip);
  const away = (size(along) / 2) * Math.tan((bend * RAD) / 2);
  const back = unit(vec(along.y, -along.x, 0));
  return add(mul(add(hip, shoulder), 0.5), mul(back, away));
}

/** The center of the head. The head follows the upper half of the torso, plus its own tilt. */
export function headOf(joints: Pick<Joints, "shoulder" | "lean" | "bend" | "head">): Vec {
  return add(joints.shoulder, mul(up(joints.lean + joints.bend / 2 + joints.head), BODY.neck));
}

/** The line of a foot, from heel to toe. `toes` is the angle of the foot: 90 is flat. */
export function footLine(ankle: Vec, toes: number): { heel: Vec; toe: Vec } {
  const forward = up(toes);
  const down = vec(-forward.y, forward.x, 0);
  const at = (along: number) =>
    vec(
      ankle.x + forward.x * along + down.x * 1.5,
      ankle.y + forward.y * along + down.y * 1.5,
      ankle.z,
    );
  return { heel: at(-3), toe: at(15) };
}

const spotPair = (value: Spot | Pair<Spot>): Pair<Spot> => ("x" in value ? [value, value] : value);
const modePair = (value: Mode | Pair<Mode>): Pair<Mode> =>
  typeof value === "string" ? [value, value] : value;
const toesPair = (value: number | Pair<number>): Pair<number> =>
  typeof value === "number" ? [value, value] : value;

/** Computes all joints of a key pose. */
export function solve(pose: Pose): Joints {
  const hip = vec(pose.hip.x, pose.hip.y);
  const lean = pose.lean;
  const bend = pose.bend ?? 0;
  const shrug = pose.shrug ?? 0;
  const knees = pose.knees ?? DEFAULT_KNEES;
  const elbow = elbowOf(pose);
  const elbowsOut = pose.elbowsOut ?? DEFAULT_ELBOWS_OUT;
  const feet = spotPair(pose.feet);
  const hands = spotPair(pose.hands);
  const spotOnSide = (spot: Spot, side: Side, fallback: number) =>
    vec(spot.x, spot.y, sign(side) * (spot.z ?? fallback));
  const shoulder = add(hip, mul(up(lean), BODY.torso));
  const lifted = add(shoulder, shrugOf({ lean, bend, shrug }));
  const leg = (side: Side) => {
    const foot = spotOnSide(feet[side], side, pose.stance ?? 8);
    return reach(
      hipJoint(hip, side),
      foot,
      BODY.thigh,
      BODY.shin,
      kneePole(side, knees, hip, foot),
    );
  };
  const arm = (side: Side) =>
    reach(
      shoulderJoint(lifted, side),
      spotOnSide(hands[side], side, pose.grip ?? 14),
      BODY.upperArm,
      BODY.forearm,
      elbowPole(side, elbow, elbowsOut),
    );
  return {
    hip,
    shoulder,
    lean,
    bend,
    waist: waistOf(hip, shoulder, bend),
    shrug,
    head: pose.head ?? 0,
    legs: [leg(0), leg(1)],
    arms: [arm(0), arm(1)],
    toes: toesPair(pose.toes ?? 90),
  };
}

const EASES: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  soft: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
};

function moveLimb(
  root: Vec,
  a: Limb,
  b: Limb,
  t: number,
  mode: Mode,
  bones: readonly [number, number],
  pole: (target: Vec) => Vec,
): Limb {
  const [first, second] = bones;
  if (mode === "fk") {
    const mid = add(root, mul(slerp(direction(a.root, a.mid), direction(b.root, b.mid), t), first));
    const end = add(mid, mul(slerp(direction(a.mid, a.end), direction(b.mid, b.end), t), second));
    return { root, mid, end };
  }
  const target =
    mode === "line"
      ? mixVec(a.end, b.end, t)
      : add(root, mixVec(sub(a.end, a.root), sub(b.end, b.root), t));
  return reach(root, target, first, second, pole(target));
}

type Key = { joints: Joints; knees: number; elbow: Elbow; elbowsOut: number };
type Curves = { lean: number; bend: number; shrug: number };

/** The hip on the way between two poses, from the anchor of the step. */
function hipBetween(a: Joints, b: Joints, t: number, step: Step, lean: number, lift: Vec): Vec {
  if (step.anchor === "feet") {
    // Go from the ankle up the turning leg bones to the hip.
    const from = a.legs[0];
    const to = b.legs[0];
    const thigh = slerp(direction(from.root, from.mid), direction(to.root, to.mid), t);
    const shin = slerp(direction(from.mid, from.end), direction(to.mid, to.end), t);
    const joint = sub(
      mixVec(from.end, to.end, t),
      add(mul(shin, BODY.shin), mul(thigh, BODY.thigh)),
    );
    return vec(joint.x, joint.y, 0);
  }
  if (step.anchor === "hands") {
    // Go from the hand along the turning arm bones to the shoulder. The hip hangs below it.
    const from = a.arms[0];
    const to = b.arms[0];
    const upper = slerp(direction(from.root, from.mid), direction(to.root, to.mid), t);
    const fore = slerp(direction(from.mid, from.end), direction(to.mid, to.end), t);
    const joint = sub(
      mixVec(from.end, to.end, t),
      add(mul(fore, BODY.forearm), mul(upper, BODY.upperArm)),
    );
    return sub(sub(vec(joint.x, joint.y, 0), lift), mul(up(lean), BODY.torso));
  }
  if (step.flight === true) {
    const air = flightHip(a.hip, b.hip, step.seconds, t);
    return vec(air.x, air.y, 0);
  }
  return mixVec(a.hip, b.hip, t);
}

/** The joints between two key poses. `t` is 0 at the first pose and 1 at the second. */
function between(a: Key, b: Key, t: number, step: Step, curves: Curves | null): Joints {
  const lean = curves?.lean ?? mix(a.joints.lean, b.joints.lean, t);
  const bend = curves?.bend ?? mix(a.joints.bend, b.joints.bend, t);
  const shrug = curves?.shrug ?? mix(a.joints.shrug, b.joints.shrug, t);
  const lift = shrugOf({ lean, bend, shrug });
  const knees = mix(a.knees, b.knees, t);
  const elbow = { x: mix(a.elbow.x, b.elbow.x, t), y: mix(a.elbow.y, b.elbow.y, t) };
  const elbowsOut = mix(a.elbowsOut, b.elbowsOut, t);
  const hip = hipBetween(a.joints, b.joints, t, step, lean, lift);
  const shoulder = add(hip, mul(up(lean), BODY.torso));
  const legModes = modePair(step.legs ?? "line");
  const armModes = modePair(step.arms ?? (step.anchor === "hands" ? "line" : "fk"));
  const leg = (side: Side) =>
    moveLimb(
      hipJoint(hip, side),
      a.joints.legs[side],
      b.joints.legs[side],
      t,
      legModes[side],
      [BODY.thigh, BODY.shin],
      (foot) => kneePole(side, knees, hip, foot),
    );
  const arm = (side: Side) =>
    moveLimb(
      shoulderJoint(add(shoulder, lift), side),
      a.joints.arms[side],
      b.joints.arms[side],
      t,
      armModes[side],
      [BODY.upperArm, BODY.forearm],
      () => elbowPole(side, elbow, elbowsOut),
    );
  return {
    hip,
    shoulder,
    lean,
    bend,
    waist: waistOf(hip, shoulder, bend),
    shrug,
    head: mix(a.joints.head, b.joints.head, t),
    legs: [leg(0), leg(1)],
    arms: [arm(0), arm(1)],
    toes: [mix(a.joints.toes[0], b.joints.toes[0], t), mix(a.joints.toes[1], b.joints.toes[1], t)],
  };
}

/** The wall ball: its radius, and how far its center is above the middle between the two hands. */
export const BALL = { radius: 17, above: 6 };

/** The center of the wall ball: in the air, or in the hands. */
export function ballCenter(joints: Joints, thrown?: Vec): Vec {
  if (thrown !== undefined) return thrown;
  const [near, far] = joints.arms;
  return vec((near.end.x + far.end.x) / 2, (near.end.y + far.end.y) / 2 - BALL.above, 0);
}

/** When a thrown ball touches the wall: the time to rise this high and stop, within limits. */
function touchTime(from: { y: number }, wall: { y: number }, seconds: number): number {
  const rise = Math.sqrt((2 * Math.max(from.y - wall.y, 1)) / GRAVITY);
  return Math.min(Math.max(rise, 0.3 * seconds), 0.7 * seconds);
}

/** The radius of the ball of the kettlebell, and how far its center is from the hands. */
export const BELL = { radius: 10, away: 16 };

/** The center of the ball of a kettlebell in both hands. It is in line with the forearms. */
export function bellCenter(joints: Joints): Vec {
  const [near, far] = joints.arms;
  const hand = mul(add(near.end, far.end), 0.5);
  const elbow = mul(add(near.mid, far.mid), 0.5);
  return add(hand, mul(unit(sub(hand, elbow)), BELL.away));
}

/**
 * The ankle of a foot that stands on its toes, on a surface at the height `floor`.
 * `toes` is the angle of the foot: 90 is flat, 150 is steep.
 */
export function tiptoe(x: number, toes: number, floor = GROUND): { x: number; y: number } {
  const forward = up(toes);
  // The lower edge of the toe touches the floor. 4.5 is half the line width of the foot.
  return { x, y: floor - 4.5 - forward.y * 15 - forward.x * 1.5 };
}

/** The same as `tiptoe()`, but from the x of the tip of the toe. */
export function tiptoeFromToe(
  toeX: number,
  toes: number,
  floor = GROUND,
): { x: number; y: number } {
  const forward = up(toes);
  return tiptoe(toeX - forward.x * 15 + forward.y * 1.5, toes, floor);
}

/** A smooth curve through the points, with no corner at a point and no overshoot (monotone cubic). */
function smooth(xs: readonly number[], ys: readonly number[]): (x: number) => number {
  const count = xs.length - 1;
  const slopes = Array.from(
    { length: count },
    (_, k) => (item(ys, k + 1) - item(ys, k)) / (item(xs, k + 1) - item(xs, k)),
  );
  const tangents = xs.map((_, k) => {
    if (k === 0) return item(slopes, 0);
    if (k === count) return item(slopes, count - 1);
    const before = item(slopes, k - 1);
    const after = item(slopes, k);
    // A point where the direction turns is a turn point: the curve is level there.
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  return (x) => {
    const k = Math.min(Math.max(xs.findIndex((value) => value >= x) - 1, 0), count - 1);
    const width = item(xs, k + 1) - item(xs, k);
    const t = Math.min(Math.max((x - item(xs, k)) / width, 0), 1);
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * item(ys, k) +
      (t3 - 2 * t2 + t) * width * item(tangents, k) +
      (-2 * t3 + 3 * t2) * item(ys, k + 1) +
      (t3 - t2) * width * item(tangents, k + 1)
    );
  };
}

/** How far the figure moved between two frames, as the step counts it. */
function moved(a: Joints, b: Joints, follow: Step["follow"]): number {
  const hip = size(sub(b.hip, a.hip));
  const lean = Math.abs(b.lean - a.lean);
  const hands = SIDES.reduce<number>(
    (sum, side) => sum + size(sub(b.arms[side].end, a.arms[side].end)),
    0,
  );
  const feet = SIDES.reduce<number>(
    (sum, side) => sum + size(sub(b.legs[side].end, a.legs[side].end)),
    0,
  );
  if (follow === "hands") return hands / 2 + 0.05 * (hip + lean);
  if (follow === "feet") return feet / 2 + 0.05 * (hip + lean);
  return hip + 0.05 * (lean + hands + feet);
}

const SAMPLES = 24;

type Sample = { part: number; local: number; way: number };
type Prepared = {
  step: Step;
  poses: readonly Key[];
  table: readonly Sample[];
  curves: {
    lean: (way: number) => number;
    bend: (way: number) => number;
    shrug: (way: number) => number;
  } | null;
};

/** A table of how far the figure has moved over the poses of a step with `via`, and the smooth curves. */
function prepare(step: Step, poses: readonly Key[]): Prepared {
  if (poses.length <= 2) return { step, poses, table: [], curves: null };
  const table: Sample[] = [];
  let way = 0;
  let before = item(poses, 0).joints;
  for (let part = 0; part < poses.length - 1; part++) {
    for (let sample = part === 0 ? 0 : 1; sample <= SAMPLES; sample++) {
      const local = sample / SAMPLES;
      const joints = between(item(poses, part), item(poses, part + 1), local, step, null);
      way += moved(before, joints, step.follow);
      before = joints;
      table.push({ part, local, way });
    }
  }
  const ends = [
    0,
    ...table
      .filter((entry, at) => entry.local === 1 && table[at + 1]?.part !== entry.part)
      .map((entry) => entry.way),
  ];
  const rises = ends.every((end, at) => at === 0 || end - item(ends, at - 1) > 0.001);
  if (!rises) return { step, poses, table, curves: null };
  return {
    step,
    poses,
    table,
    curves: {
      lean: smooth(
        ends,
        poses.map((pose) => pose.joints.lean),
      ),
      bend: smooth(
        ends,
        poses.map((pose) => pose.joints.bend),
      ),
      shrug: smooth(
        ends,
        poses.map((pose) => pose.joints.shrug),
      ),
    },
  };
}

/** Where the figure is at the eased part `t` of a step: which two poses, and how far between them. */
function sampleAt(table: readonly Sample[], t: number): Sample {
  const whole = table.at(-1)?.way ?? 0;
  if (whole === 0) return { part: 0, local: t, way: 0 };
  const way = t * whole;
  const next = Math.max(
    table.findIndex((entry) => entry.way >= way),
    1,
  );
  const from = item(table, next - 1);
  const to = item(table, next);
  const inside = (way - from.way) / (to.way - from.way || 1);
  // At the border of two parts, the entry before is the end of the part before (local 1).
  const fromLocal = from.part === to.part ? from.local : 0;
  return { part: to.part, local: fromLocal + (to.local - fromLocal) * inside, way };
}

/** Prepares a loop: solves the key poses once. `at(seconds)` then gives the joints of one frame. */
export function motion(start: Pose, steps: readonly Step[]): Motion {
  const keyOf = (pose: Pose): Key => ({
    joints: solve(pose),
    knees: pose.knees ?? DEFAULT_KNEES,
    elbow: elbowOf(pose),
    elbowsOut: pose.elbowsOut ?? DEFAULT_ELBOWS_OUT,
  });
  let previous = start;
  const parts = steps.map((step) => {
    const poses = [previous, ...(step.via ?? []), step.to].map(keyOf);
    previous = step.to;
    return prepare(step, poses);
  });
  const last = solve(previous);
  const total = steps.reduce((sum, step) => sum + step.seconds, 0);
  const secondsOf = (from: number, to: number) =>
    steps.slice(from, to).reduce((sum, step) => sum + step.seconds, 0);

  /** Where a thrown ball is: `rest` seconds after the start of the step `index`, which has `throw`. */
  const thrownBall = (index: number, rest: number): Vec | undefined => {
    const wall = item(steps, index).throw;
    if (wall === undefined) return undefined;
    let first = index;
    let lastStep = index;
    while (first > 0 && item(steps, first - 1).throw !== undefined) first--;
    while (lastStep < steps.length - 1 && item(steps, lastStep + 1).throw !== undefined) lastStep++;
    const air = secondsOf(first, lastStep + 1);
    const since = secondsOf(first, index) + rest;
    const firstPoses = item(parts, first).poses;
    const lastPoses = item(parts, lastStep).poses;
    const from = ballCenter(item(firstPoses, 0).joints);
    const to = ballCenter(item(lastPoses, lastPoses.length - 1).joints);
    const rise = touchTime(from, wall, air);
    const point =
      since <= rise
        ? flightHip(from, wall, rise, since / rise)
        : flightHip(wall, to, air - rise, (since - rise) / (air - rise));
    return vec(point.x, point.y, 0);
  };

  return {
    total,
    at(seconds) {
      let rest = ((seconds % total) + total) % total;
      for (const [index, { step, poses, table, curves }] of parts.entries()) {
        if (rest <= step.seconds) {
          const eased = EASES[step.ease ?? "inOut"](rest / step.seconds);
          const { part, local, way } = sampleAt(table, eased);
          const values = curves && {
            lean: curves.lean(way),
            bend: curves.bend(way),
            shrug: curves.shrug(way),
          };
          const joints = between(item(poses, part), item(poses, part + 1), local, step, values);
          const thrown = thrownBall(index, rest);
          const frame = { joints, progress: seconds / total };
          return thrown === undefined ? frame : { ...frame, thrown };
        }
        rest -= step.seconds;
      }
      return { joints: last, progress: 1 };
    },
  };
}
