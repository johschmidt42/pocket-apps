import { PLAYER } from "../content/tuning.ts";
import { SEED_SHOOTER, type WeaponName } from "../content/weapons.ts";
import { FIRST_WAVE, type Wave } from "../content/waves.ts";
import { createEnemies } from "./enemies.ts";
import { FIELD } from "./field.ts";

/** Seven, the ladybug of the player. */
export type Player = {
  x: number;
  y: number;
  /** The spots that Seven has left. They are his lives. */
  spots: number;
  /** After a hit, nothing can hurt Seven for this number of ticks. */
  safeTicks: number;
  /** Debug: nothing can hurt Seven. */
  immortal: boolean;
  /** The pressure of the gas tank, from 0 (empty) to 1 (full). */
  pressure: number;
  /** True after the tank was empty, until the pressure is back. A locked weapon does not spray. */
  tankLocked: boolean;
  /** True in a tick in which Seven sprays. */
  spraying: boolean;
  /** The level of the fire power, from 1 to `MAX_LEVEL`. */
  level: number;
  /** The weapon that Seven carries. */
  weapon: WeaponName;
  /** The stones in the drum of the "Kernspucker". */
  seeds: number;
  /** True after the drum was empty, until it is full again. */
  drumLocked: boolean;
  /** The next shot is possible after this number of ticks. */
  shotTicks: number;
  /** The ticks since the last shot. */
  idleTicks: number;
};

/** One small cloud of gas. */
export type Puff = {
  x: number;
  y: number;
  /** The position one tick before. The picture shows a point between the two positions. */
  prevX: number;
  prevY: number;
  /** The speed in field units per second. */
  speedX: number;
  speedY: number;
  /** The age and the length of the life, in ticks. */
  age: number;
  life: number;
  radius: number;
  startRadius: number;
  endRadius: number;
  damage: number;
  /** A number from 0 to 1 that is different for each puff. The picture uses it for the shape of the cloud. */
  look: number;
};

/** One cherry stone of the "Kernspucker". It flies straight up. */
export type Seed = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** The speed in field units per second. */
  speedY: number;
  radius: number;
  damage: number;
};

/** One enemy of the wave. */
export type Enemy = {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  hitPoints: number;
  /**
   * - "waiting": out of the field, before its start.
   * - "entering": on the way from its corner to its place.
   * - "formation": at its place in the block.
   * - "spitting": at its place, while it spits one drop.
   */
  state: "waiting" | "entering" | "formation" | "spitting";
  /** The ticks since the state began. */
  stateTicks: number;
  /** The place in the block. */
  column: number;
  row: number;
  /** The corner from which it comes: -1 is the left one, 1 is the right one. */
  side: -1 | 1;
  /** It starts after this number of ticks. */
  delayTicks: number;
  /** The gas can hurt it again after this number of ticks. */
  gasTicks: number;
};

/** One drop that an enemy spat. It falls straight down. */
export type Drop = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** The speed in field units per second. It is negative: the drop falls. */
  speedY: number;
  radius: number;
};

/** One grain of pollen or a clump of grains that a dead enemy dropped. Seven collects it. */
export type Loot = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** The speed in field units per second. */
  speedX: number;
  speedY: number;
  /** The number of grains, from 1 to 4. Each grain is one point of the score. */
  grains: number;
  radius: number;
  /** The number of contacts with the bottom edge. */
  bounces: number;
  /** 0 while the clump moves. Then the ticks since it lies still. */
  restTicks: number;
};

/** The full state of the game. `step()` changes it in place. */
export type GameState = {
  /** The number of ticks since the start of the game. */
  tick: number;
  /** The place of the generator of random numbers. See `random.ts`. */
  seed: number;
  wave: Wave;
  player: Player;
  puffs: Puff[];
  seeds: Seed[];
  enemies: Enemy[];
  drops: Drop[];
  loot: Loot[];
  /** The grains of pollen that Seven collected. */
  score: number;
  /** `null` while the game runs. */
  over: "won" | "lost" | null;
};

/** The radius of the hit area of Seven. It is much smaller than his picture, as usual in the genre. */
export const PLAYER_HIT_RADIUS = 15;

/** Seven keeps this distance from the edges, so that most of him stays in the picture. */
export const PLAYER_MARGIN = 28;

/** The state at the start of a game: Seven is at the bottom center, and the enemies wait out of the field. */
export function createState(seed = 1, wave: Wave = FIRST_WAVE): GameState {
  return {
    tick: 0,
    seed,
    wave,
    player: {
      x: 0,
      y: -FIELD.height / 2 + 150,
      spots: PLAYER.spots,
      safeTicks: 0,
      immortal: false,
      pressure: 1,
      tankLocked: false,
      spraying: false,
      level: 1,
      weapon: "seeds",
      seeds: SEED_SHOOTER.seeds,
      drumLocked: false,
      shotTicks: 0,
      idleTicks: 0,
    },
    puffs: [],
    seeds: [],
    enemies: createEnemies(wave),
    drops: [],
    loot: [],
    score: 0,
    over: null,
  };
}
