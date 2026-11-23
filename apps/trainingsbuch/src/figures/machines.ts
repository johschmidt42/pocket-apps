// The three machines: where their parts are, and helpers that put the figure on them.
// All places are relative to the `x` of the equipment. The y values are absolute (the ground is at y = 206).
import { GROUND, up } from "./skeleton.ts";

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
