import { moveDrops, moveEnemies } from "./enemies.ts";
import type { SimEvent } from "./events.ts";
import { FIELD } from "./field.ts";
import { movePuffs, spray } from "./gas.ts";
import { checkWon, gasHits, playerHits, seedHits } from "./hits.ts";
import type { Input } from "./input.ts";
import { moveSeeds, shoot } from "./seeds.ts";
import { PLAYER_MARGIN, type GameState } from "./state.ts";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Calculates one tick. Changes `state` in place. Returns what happened in this tick. */
export function step(state: GameState, input: Input): SimEvent[] {
  const events: SimEvent[] = [];
  const { player } = state;
  // A dead Seven does not move and does not use his weapon.
  const alive = state.over !== "lost";
  if (alive) {
    const maxX = FIELD.width / 2 - PLAYER_MARGIN;
    const maxY = FIELD.height / 2 - PLAYER_MARGIN;
    player.x = clamp(player.x + input.moveX, -maxX, maxX);
    player.y = clamp(player.y + input.moveY, -maxY, maxY);
    if (input.weapon !== null) player.weapon = input.weapon;
  }
  movePuffs(state);
  moveSeeds(state);
  // The weapon that Seven does not use fills again in this time.
  const fires = alive && input.spray;
  spray(state, fires && player.weapon === "spray", events);
  shoot(state, fires && player.weapon === "seeds", events);
  moveEnemies(state);
  moveDrops(state);
  gasHits(state, events);
  seedHits(state, events);
  checkWon(state, events);
  playerHits(state, events);
  state.tick += 1;
  return events;
}
