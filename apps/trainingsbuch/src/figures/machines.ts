// The machines and the rings: where their parts are, and helpers that put the figure on them.
// All places are relative to the `x` of the equipment. The y values are absolute (the ground is at y = 206).
import { GROUND, item, up, vec, type Joints, type Vec } from "./skeleton.ts";

const RAD = Math.PI / 180;
type Spot2 = { x: number; y: number };

/** The rowing machine. `x` is the x of the ankles on the foot plates. */
export const ROWER = {
  /** The height of the hip joint of a figure that sits on the seat. The hip has this y in each pose. */
  hipY: GROUND - 47.5,
  /** The top of the rail. The seat rolls on it. The rail goes from `x - 140` to `x - 4`. */
  railY: GROUND - 33,
  /** The ankle on the foot plate, and the angle of the foot (`toes`): the foot points forward and up. */
  ankleY: GROUND - 30,
  toes: 45,
  /**
   * Where the chain leaves the machine: `x + chain.dx`, `chain.y`. The handle is at the hands.
   * At the catch, with vertical shins, a forward lean and straight arms, the hands are at about `x + 44`.
   */
  chain: { dx: 48, y: GROUND - 62 },
  /** The flywheel: its center is at `x + wheel.dx`, `wheel.y`. */
  wheel: { dx: 70, y: GROUND - 38, radius: 27 },
  /** With straight legs, the hip is this far behind the ankles. */
  reach: Math.sqrt(80 * 80 - 17.5 * 17.5),
};

/**
 * The SkiErg of Concept2, from its spec sheet (216 cm high, 52 cm wide at the top, floor stand 127 cm long).
 * `x` is the x of its post. The flywheel is at the BOTTOM of the post, near the floor. The post goes up to the
 * top, where it opens to a V with one pulley at each end. The monitor is on the post at the height of the hip.
 */
export const SKIERG = {
  /** The two cords come from the pulleys at the top: `x + top.dx`, `top.y`, `top.half` to each side. A hand cannot be higher. */
  top: { dx: -6, y: 4, half: 25 },
  /** The flywheel, at the bottom, on the side of the post that looks at the figure. */
  wheel: { dx: -7, y: GROUND - 35, radius: 21 },
  /** The monitor on the post. */
  monitor: { dx: -8, y: GROUND - 98 },
  /** The base on the floor goes from `x - 112` to `x + 15`. The figure stands on it. */
  base: { from: -112, to: 15 },
};

/** The air bike. `x` is the x of the hip joint on the saddle. */
export const BIKE = {
  /** The height of the hip joint of a figure that sits on the saddle. The hip has this y in each pose. */
  hipY: GROUND - 98,
  /** The axle of the cranks: `x + crank.dx`, `crank.y`. The pedals turn on a circle with this radius around it. */
  crank: { dx: 20, y: GROUND - 32, radius: 16.5 },
  /** The pivot of the two levers: `x + lever.dx`, `lever.y`. A grip is `lever.length` from it. */
  lever: { dx: 58, y: GROUND - 50, length: 62 },
  /** The fan: its center is at `x + fan.dx`, `fan.y`. */
  fan: { dx: 74, y: GROUND - 34, radius: 30 },
};

/**
 * The pedal under a foot: the place under the ball of the foot. `toes` is the angle of the foot.
 */
export function pedalOf(ankle: Spot2, toes: number): Spot2 {
  const forward = up(toes);
  // 10 along the foot from the ankle, and 6 to the side of the sole (1.5 to the line of the foot, 4.5 to its edge).
  return {
    x: ankle.x + forward.x * 10 - forward.y * 6,
    y: ankle.y + forward.y * 10 + forward.x * 6,
  };
}

/**
 * The ankle of a foot on a pedal of the bike at `x`. `toes` is the angle of the foot.
 * `angle` is the angle of the crank: 0 is the top of the circle, 90 is in front.
 * At 90, the foot pushes down. 180 is the bottom, 270 is behind.
 * Give the far foot the angle plus 180.
 */
export function pedalFoot(x: number, angle: number, toes: number): Spot2 {
  const pedal = {
    x: x + BIKE.crank.dx + Math.sin(angle * RAD) * BIKE.crank.radius,
    y: BIKE.crank.y - Math.cos(angle * RAD) * BIKE.crank.radius,
  };
  const zero = pedalOf({ x: 0, y: 0 }, toes);
  return { x: pedal.x - zero.x, y: pedal.y - zero.y };
}

/**
 * A hand on a grip of the bike at `x`. `swing` is the angle of the lever, in degrees.
 * 0 is upright. A positive angle is forward (the arm pushes), a negative angle is back (the arm pulls).
 * The levers swing about 14 degrees to each side.
 * The two levers move against each other: give the far hand the negative angle.
 */
export function leverHand(x: number, swing: number): Spot2 {
  return {
    x: x + BIKE.lever.dx + Math.sin(swing * RAD) * BIKE.lever.length,
    y: BIKE.lever.y - Math.cos(swing * RAD) * BIKE.lever.length,
  };
}

/** A flat bench, with the sizes of the IPF rules: at least 1.22 m long, 29 to 32 cm wide, 42 to 45 cm high. */
export const BENCH = { length: 117, halfWidth: 14.5, height: 42, pad: 7 };

/**
 * Gymnastic rings, with the sizes of the FIG norm: 18 cm inside, 2.8 cm thick. `radius` is the middle line of the
 * ring. The two straps hang 50 cm apart (`half` to each side) and are about 3 m long (`strap`, to the grip).
 */
export const RINGS = { radius: 10, thick: 2.7, half: 24, strap: 288 };

/**
 * The point where the strap of the ring in `hand` hangs from. `x` and `y` of the equipment are the grip when the
 * straps hang straight down. The side of the hand (its `z`) picks the strap.
 */
export function ringAnchor(rings: Spot2, hand: Vec): Vec {
  return vec(rings.x, rings.y - RINGS.strap, hand.z < 0 ? -RINGS.half : RINGS.half);
}

const minus = (a: Vec, b: Vec): Vec => vec(a.x - b.x, a.y - b.y, a.z - b.z);
const plus = (a: Vec, b: Vec): Vec => vec(a.x + b.x, a.y + b.y, a.z + b.z);
const times = (a: Vec, k: number): Vec => vec(a.x * k, a.y * k, a.z * k);
const norm = (a: Vec): Vec => times(a, 1 / (Math.hypot(a.x, a.y, a.z) || 1));

/**
 * How far a point must go out to the side (in z, away from the middle of the body) so that it is out of a
 * limb. The limb is a thick line, `radius` to each side. 0: the point is not in the limb, or it cannot go out
 * by z alone.
 */
function outOf(point: Vec, a: Vec, b: Vec, radius: number, out: number): number {
  const ab = minus(b, a);
  const length2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
  const along = (point.x - a.x) * ab.x + (point.y - a.y) * ab.y + (point.z - a.z) * ab.z;
  const nearest = plus(a, times(ab, Math.min(Math.max(along / (length2 || 1), 0), 1)));
  const flat = Math.hypot(point.x - nearest.x, point.y - nearest.y);
  if (flat >= radius) return 0;
  return Math.max(Math.sqrt(radius * radius - flat * flat) - (point.z - nearest.z) * out, 0);
}

/** The upper hull of points (distance along the strap, push): a tight rope touches the highest ones. */
function upperHull(points: readonly (readonly [number, number])[]): [number, number][] {
  const hull: [number, number][] = [];
  for (const [s, push] of points) {
    while (hull.length >= 2) {
      const [as, ap] = item(hull, hull.length - 2);
      const [bs, bp] = item(hull, hull.length - 1);
      if ((bs - as) * (push - ap) - (bp - ap) * (s - as) < 0) break;
      hull.pop();
    }
    hull.push([s, push]);
  }
  return hull;
}

/**
 * The strap of the ring in the hand of `side`, from the top of the ring to its anchor. The strap is a tight
 * rope: where the arm of the same side is in its way, the arm pushes it out to the side, and the rope goes in
 * straight lines around it. The radii are half the widths of the drawn arm plus half the strap. `up` is the
 * direction from the hand to the top of the ring: the ring hangs in the line of the lowest piece.
 */
export function strapOf(rings: Spot2, joints: Joints, side: 0 | 1): { points: Vec[]; up: Vec } {
  const arm = joints.arms[side];
  const anchor = ringAnchor(rings, arm.end);
  const out = arm.end.z < 0 ? -1 : 1;
  const limbs: [Vec, Vec, number][] = [
    [arm.root, arm.mid, 5 + 1.5],
    [arm.mid, arm.end, 4.5 + 1.5],
  ];
  let up = norm(minus(anchor, arm.end));
  let points: Vec[] = [];
  // Twice: the first pass finds where the rope bends, the second hangs the ring in the line of the lowest piece.
  for (let pass = 0; pass < 2; pass++) {
    const top = plus(arm.end, times(up, 2 * RINGS.radius));
    const along = norm(minus(anchor, top));
    const length = Math.hypot(anchor.x - top.x, anchor.y - top.y, anchor.z - top.z);
    // How far each point of a straight strap must go out. The body is at most 150 above the ring.
    const pushed: [number, number][] = [[0, 0]];
    for (let s = 1; s < Math.min(150, length); s += 1) {
      const point = plus(top, times(along, s));
      const push = Math.max(...limbs.map(([a, b, radius]) => outOf(point, a, b, radius, out)));
      if (push > 0) pushed.push([s, push]);
    }
    pushed.push([length, 0]);
    points = upperHull(pushed).map(([s, push]) =>
      plus(plus(top, times(along, s)), vec(0, 0, push * out)),
    );
    up = norm(minus(item(points, 1), arm.end));
  }
  return { points, up };
}
