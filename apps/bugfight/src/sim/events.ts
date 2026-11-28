/**
 * Something that happened in a tick. The picture makes effects and motions from the events.
 * Later, the sound uses the same events.
 */
export type SimEvent =
  /** The tank of Seven is empty. The weapon is locked now. */
  | { type: "tank-empty" }
  /** Seven shot one time with the "Kernspucker". */
  | { type: "seed-shot" }
  /** The drum of the "Kernspucker" is empty. The weapon is locked now. */
  | { type: "drum-empty" }
  /** An enemy took damage and lives on. */
  | { type: "enemy-hit"; id: number }
  /** An enemy is dead. It is no longer in the state. */
  | { type: "enemy-died"; id: number; x: number; y: number }
  /** Seven collected a clump of pollen with this number of grains. */
  | { type: "loot-collected"; x: number; y: number; grains: number }
  /** Seven lost a spot. */
  | { type: "player-hit" }
  /** Seven lost his last spot. The game is lost. */
  | { type: "player-died" }
  /** The last enemy of the wave is dead. The game is won. */
  | { type: "wave-cleared" };
