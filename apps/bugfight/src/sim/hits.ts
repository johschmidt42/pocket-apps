import { ANT } from "../content/enemies.ts";
import { GAS_HITS_PER_SECOND, PLAYER } from "../content/tuning.ts";
import type { SimEvent } from "./events.ts";
import { TICKS_PER_SECOND } from "./field.ts";
import { dropLoot } from "./loot.ts";
import { PLAYER_HIT_RADIUS, type Enemy, type GameState } from "./state.ts";

/** A touch of the body of an enemy counts only near its center: its legs and wings do not hurt. */
const BODY_PART = 0.8;

function touch(ax: number, ay: number, bx: number, by: number, distance: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy < distance * distance;
}

/** Takes hit points from an enemy. Returns true if the enemy is dead. The caller removes it from the state. */
function hurt(state: GameState, enemy: Enemy, damage: number, events: SimEvent[]): boolean {
  enemy.hitPoints -= damage;
  if (enemy.hitPoints <= 0) {
    events.push({ type: "enemy-died", id: enemy.id, x: enemy.x, y: enemy.y });
    dropLoot(state, enemy.x, enemy.y);
    return true;
  }
  events.push({ type: "enemy-hit", id: enemy.id });
  return false;
}

/**
 * The gas hurts the enemies. Gas is an area of damage: an enemy in a puff takes damage some times
 * per second, and more puffs on it do not hurt more.
 */
export function gasHits(state: GameState, events: SimEvent[]): void {
  const pause = Math.round(TICKS_PER_SECOND / GAS_HITS_PER_SECOND);
  let kept = 0;
  for (const enemy of state.enemies) {
    if (enemy.gasTicks > 0) enemy.gasTicks -= 1;
    if (enemy.state !== "waiting" && enemy.gasTicks === 0) {
      const puff = state.puffs.find((candidate) =>
        touch(candidate.x, candidate.y, enemy.x, enemy.y, candidate.radius + ANT.radius),
      );
      if (puff !== undefined) {
        enemy.gasTicks = pause;
        if (hurt(state, enemy, puff.damage, events)) continue;
      }
    }
    state.enemies[kept] = enemy;
    kept += 1;
  }
  state.enemies.length = kept;
}

/** A stone hurts the first enemy that it touches. Then the stone is gone. */
export function seedHits(state: GameState, events: SimEvent[]): void {
  let kept = 0;
  for (const seed of state.seeds) {
    const index = state.enemies.findIndex(
      (enemy) =>
        enemy.state !== "waiting" &&
        touch(seed.x, seed.y, enemy.x, enemy.y, seed.radius + ANT.radius),
    );
    const enemy = state.enemies[index];
    if (enemy === undefined) {
      state.seeds[kept] = seed;
      kept += 1;
    } else if (hurt(state, enemy, seed.damage, events)) {
      state.enemies.splice(index, 1);
    }
  }
  state.seeds.length = kept;
}

/** The game is won when the last enemy is dead. */
export function checkWon(state: GameState, events: SimEvent[]): void {
  if (state.enemies.length > 0 || state.over !== null) return;
  state.over = "won";
  events.push({ type: "wave-cleared" });
}

/** A drop or the body of an enemy hurts Seven: he loses one spot. Without spots, the game is lost. */
export function playerHits(state: GameState, events: SimEvent[]): void {
  const { player } = state;
  if (state.over !== null) return;
  if (player.safeTicks > 0) {
    player.safeTicks -= 1;
    return;
  }
  if (player.immortal) return;

  const drop = state.drops.findIndex((candidate) =>
    touch(candidate.x, candidate.y, player.x, player.y, candidate.radius + PLAYER_HIT_RADIUS),
  );
  const body = state.enemies.some(
    (enemy) =>
      enemy.state !== "waiting" &&
      touch(enemy.x, enemy.y, player.x, player.y, ANT.radius * BODY_PART + PLAYER_HIT_RADIUS),
  );
  if (drop === -1 && !body) return;

  // The drop that hit Seven is gone.
  if (drop !== -1) state.drops.splice(drop, 1);
  player.spots -= 1;
  player.safeTicks = Math.round(PLAYER.safeSeconds * TICKS_PER_SECOND);
  events.push({ type: "player-hit" });
  if (player.spots <= 0) {
    state.over = "lost";
    player.spraying = false;
    events.push({ type: "player-died" });
  }
}
