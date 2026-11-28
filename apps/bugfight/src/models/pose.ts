/** Three numbers: a place, a size, or the three angles of a turn (in radians, around x, y and z). */
export type Vec3 = [number, number, number];

/** How one part differs from its rest state. */
export type PartPose = {
  /** A turn around the joint of the part, after the turn of the rest state. */
  turn?: Vec3;
  /** A move of the joint. */
  move?: Vec3;
  /** A change of the size of the part and its children. One number changes all three directions. */
  grow?: number | Vec3;
};

/** How a figure differs from its rest state: one entry per part that moves. The key is the name of the part. */
export type Pose = Record<string, PartPose>;

const ZERO: Vec3 = [0, 0, 0];
const ONE: Vec3 = [1, 1, 1];

function growOf(part: PartPose | undefined): Vec3 {
  const grow = part?.grow;
  if (grow === undefined) return ONE;
  return typeof grow === "number" ? [grow, grow, grow] : grow;
}

function combine(
  a: PartPose | undefined,
  b: PartPose | undefined,
  sum: (a: number, b: number) => number,
  product: (a: number, b: number) => number,
): PartPose {
  const each = (x: Vec3, y: Vec3, f: (a: number, b: number) => number): Vec3 => [
    f(x[0], y[0]),
    f(x[1], y[1]),
    f(x[2], y[2]),
  ];
  return {
    turn: each(a?.turn ?? ZERO, b?.turn ?? ZERO, sum),
    move: each(a?.move ?? ZERO, b?.move ?? ZERO, sum),
    grow: each(growOf(a), growOf(b), product),
  };
}

/** Puts poses on top of each other: turns and moves add up, sizes multiply. */
export function addPoses(...poses: Pose[]): Pose {
  const result: Pose = {};
  for (const pose of poses) {
    for (const [name, part] of Object.entries(pose)) {
      result[name] = combine(
        result[name],
        part,
        (a, b) => a + b,
        (a, b) => a * b,
      );
    }
  }
  return result;
}

/** A pose between `from` (at 0) and `to` (at 1). A part that one pose does not name is at rest there. */
export function mixPoses(from: Pose, to: Pose, amount: number): Pose {
  const result: Pose = {};
  const mix = (a: number, b: number) => a + (b - a) * amount;
  for (const name of new Set([...Object.keys(from), ...Object.keys(to)])) {
    result[name] = combine(from[name], to[name], mix, mix);
  }
  return result;
}

/** A pose with a part of its strength: 0 is the rest state, 1 is the full pose. */
export function weakenPose(pose: Pose, amount: number): Pose {
  return mixPoses({}, pose, amount);
}

/**
 * The pose of a right part and of its left mirror part.
 * Both poses are written for the right side. The function mirrors the second one for the left part.
 * `rightName` must contain "right": the left part has the same name with "left".
 */
export function bothSides(rightName: string, right: PartPose, left: PartPose = right): Pose {
  const mirrored: PartPose = {};
  if (left.turn !== undefined) mirrored.turn = [left.turn[0], -left.turn[1], -left.turn[2]];
  if (left.move !== undefined) mirrored.move = [-left.move[0], left.move[1], left.move[2]];
  if (left.grow !== undefined) mirrored.grow = left.grow;
  return { [rightName]: right, [rightName.replace("right", "left")]: mirrored };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** A wave from -1 to 1 for motion that repeats. `phase` shifts the start: 0.5 is half a turn later. */
export function wave(seconds: number, perSecond: number, phase = 0): number {
  return Math.sin(2 * Math.PI * (seconds * perSecond + phase));
}

/** A soft step from 0 to 1: slow start, slow end. */
export function ease(amount: number): number {
  const t = clamp(amount, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * The value at `time` on a list of keys `[time, value]`, with a soft curve between two keys.
 * Before the first key, the value is that of the first key. After the last key, it is that of the last key.
 */
export function keys(points: [number, number][], time: number): number {
  const first = points[0];
  if (first === undefined) return 0;
  let last = first;
  for (const point of points) {
    if (time < point[0]) {
      const span = point[0] - last[0];
      if (span <= 0) return point[1];
      return last[1] + (point[1] - last[1]) * ease((time - last[0]) / span);
    }
    last = point;
  }
  return last[1];
}
