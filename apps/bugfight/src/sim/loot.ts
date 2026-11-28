import { LOOT } from "../content/tuning.ts";
import type { SimEvent } from "./events.ts";
import { FIELD, TICK_SECONDS, TICKS_PER_SECOND } from "./field.ts";
import { random } from "./random.ts";
import { PLAYER_HIT_RADIUS, type GameState } from "./state.ts";

/** The number of grains of a new clump. Most clumps are one grain. A big clump is rare. */
function grainsOf(pick: number): number {
  let rest = pick;
  for (const [grains, share] of LOOT.clumps) {
    if (rest < share) return grains;
    rest -= share;
  }
  return 1;
}

/** A dead enemy drops pollen at its place, but not each enemy. */
export function dropLoot(state: GameState, x: number, y: number): void {
  if (random(state) >= LOOT.chance) return;
  const grains = grainsOf(random(state));
  state.loot.push({
    x,
    y,
    prevX: x,
    prevY: y,
    // The clump pops up a little and flies to a side.
    speedX: (random(state) * 2 - 1) * LOOT.sideSpeed,
    speedY: LOOT.popSpeed,
    grains,
    radius: LOOT.radius + (grains - 1) * LOOT.radiusPerGrain,
    bounces: 0,
    restTicks: 0,
  });
}

/**
 * Moves each clump of pollen for one tick. A clump falls, hops at the bottom edge some times,
 * each time less high, then lies still for a moment and goes away. Near Seven, it flies to him.
 * Seven collects a clump that he touches: each grain is one point of the score.
 */
export function moveLoot(state: GameState, events: SimEvent[]): void {
  const { player } = state;
  // A dead Seven collects nothing.
  const alive = state.over !== "lost";
  const floor = -FIELD.height / 2;
  const wall = FIELD.width / 2;
  const restTicks = Math.round(LOOT.restSeconds * TICKS_PER_SECOND);

  let kept = 0;
  for (const clump of state.loot) {
    clump.prevX = clump.x;
    clump.prevY = clump.y;
    const dx = player.x - clump.x;
    const dy = player.y - clump.y;
    const distance = Math.hypot(dx, dy);

    if (alive && distance < clump.radius + PLAYER_HIT_RADIUS + LOOT.catchDistance) {
      state.score += clump.grains;
      events.push({ type: "loot-collected", x: clump.x, y: clump.y, grains: clump.grains });
      continue;
    }
    if (alive && distance < LOOT.magnetDistance) {
      // The magnet: the clump flies straight to Seven.
      const part = Math.min((LOOT.magnetSpeed * TICK_SECONDS) / distance, 1);
      clump.x += dx * part;
      clump.y += dy * part;
    } else if (clump.restTicks > 0) {
      clump.restTicks += 1;
      if (clump.restTicks > restTicks) continue;
    } else {
      clump.speedY -= LOOT.gravity * TICK_SECONDS;
      clump.x += clump.speedX * TICK_SECONDS;
      clump.y += clump.speedY * TICK_SECONDS;
      // The side edges of the field send the clump back.
      if (Math.abs(clump.x) > wall - clump.radius) {
        clump.x = Math.sign(clump.x) * (wall - clump.radius);
        clump.speedX = -clump.speedX;
      }
      if (clump.y <= floor + clump.radius && clump.speedY < 0) {
        clump.y = floor + clump.radius;
        clump.bounces += 1;
        if (clump.bounces >= LOOT.bounces) {
          clump.speedX = 0;
          clump.speedY = 0;
          clump.restTicks = 1;
        } else {
          clump.speedY = -clump.speedY * LOOT.bounce;
          clump.speedX *= LOOT.bounce;
        }
      }
    }
    state.loot[kept] = clump;
    kept += 1;
  }
  state.loot.length = kept;
}
