// The numbers of the balance. Change the feel of the game here, not in the logic.

/** The gas tank of Seven. The pressure goes from 0 (empty) to 1 (full). */
export const TANK = {
  /** A full tank is empty after this time of spraying. */
  spraySeconds: 4.5,
  /** An empty tank is full after this time without spraying. */
  refillSeconds: 2.2,
  /** After the tank was empty, the weapon is locked until the pressure is back at this value. */
  unlockAt: 1,
};

/** The fire power has the levels 1 to this number. */
export const MAX_LEVEL = 10;

/** The nearest level of the fire power for a number. A value that is no number gives level 1. */
export function levelOf(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(Math.max(Math.round(level), 1), MAX_LEVEL);
}

/** The end of the barrel of the "Kernspucker", in front of the center of Seven. The stones start there. */
export const MUZZLE_Y = 46;

/** The place of the tip of the spray nozzle, relative to the center of Seven. */
export const NOZZLE = { x: 0, y: 41 };

/** The lives of Seven. */
export const PLAYER = {
  /** Seven starts with this number of spots. One hit costs one spot. */
  spots: 7,
  /** After a hit, nothing can hurt Seven for this time. */
  safeSeconds: 1.5,
};

/** An enemy in the gas takes damage this number of times per second. More puffs on it do not hurt more. */
export const GAS_HITS_PER_SECOND = 10;
