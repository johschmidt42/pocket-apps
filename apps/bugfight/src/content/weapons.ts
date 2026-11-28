import { MAX_LEVEL } from "./tuning.ts";

/** A weapon of Seven. It sprays puffs of gas. All lengths are in field units, all times in seconds. */
export type Weapon = {
  name: string;
  /** The number of puffs that one stream makes in one second. */
  puffsPerSecond: number;
  /** The speed of a new puff. */
  speed: number;
  /** A puff starts with a speed between `speed * (1 - speedSpread)` and `speed * (1 + speedSpread)`. */
  speedSpread: number;
  /** The direction of a puff differs from that of its stream by at most this angle, in radians. */
  angleSpread: number;
  /** How fast a puff becomes slower. A higher number stops it earlier. */
  drag: number;
  /** A puff goes away after this time. */
  seconds: number;
  /** The radius of a puff at its start and at its end. */
  startRadius: number;
  endRadius: number;
  /** The damage of one touch of a puff. */
  damage: number;
};

/** "Zitronella-Nebel": a wide cloud. Strong against a group, weak against one hard enemy. */
export const ZITRONELLA: Weapon = {
  name: "Zitronella-Nebel",
  puffsPerSecond: 30,
  speed: 1250,
  speedSpread: 0.12,
  angleSpread: 0.05,
  drag: 2.2,
  seconds: 1.1,
  startRadius: 18,
  endRadius: 56,
  damage: 0.5,
};

/** One stream of puffs. All streams start at the one nozzle of Seven. */
export type Stream = {
  /** The direction, in radians from straight up. A positive angle points to the right. */
  angle: number;
};

const DEGREES = Math.PI / 180;

/**
 * The streams of a level of the fire power. Level 1 has one stream straight up.
 * Each level adds one stream and makes the fan of the streams 6 degrees wider.
 */
export function streamsOf(level: number): Stream[] {
  const count = Math.min(Math.max(Math.round(level), 1), MAX_LEVEL);
  const fan = 6 * (count - 1) * DEGREES;
  return Array.from({ length: count }, (_, index) => ({
    angle: count === 1 ? 0 : -fan / 2 + (fan * index) / (count - 1),
  }));
}

/** A higher level makes the puffs larger and stronger. Level 1 gives 1. */
export function powerOf(level: number): { radius: number; damage: number } {
  const steps = Math.min(Math.max(Math.round(level), 1), MAX_LEVEL) - 1;
  return { radius: 1 + 0.03 * steps, damage: 1 + 0.1 * steps };
}

/** The weapons that Seven can carry. The player sees the weapon on the back of Seven. */
export type WeaponName = "spray" | "seeds";

/**
 * "Kernspucker": shoots cherry stones from a drum, as a revolver does. A stone is fast and hard,
 * hits only the first enemy and is gone. Strong against one enemy, weak against a group.
 */
export const SEED_SHOOTER = {
  name: "Kernspucker",
  /** The number of stones in a full drum. */
  seeds: 24,
  shotsPerSecond: 6,
  /** An empty drum is full again after this time. Until then, the weapon is locked. */
  refillSeconds: 1.2,
  /** A drum that is not empty starts to fill again after this time without a shot. */
  refillDelaySeconds: 0.4,
  speed: 1700,
  radius: 7,
  // One stone kills an ant.
  damage: 8,
  /** Two stones of one shot fly side by side, with this distance. */
  gap: 16,
};

/**
 * The stones of one shot at a level of the fire power. Each level makes a stone stronger.
 * The levels 4, 7 and 10 add one stone that flies beside the others.
 */
export function seedsOf(level: number): { count: number; damage: number } {
  const steps = Math.min(Math.max(Math.round(level), 1), MAX_LEVEL) - 1;
  return { count: 1 + Math.floor(steps / 3), damage: SEED_SHOOTER.damage * (1 + 0.25 * steps) };
}
