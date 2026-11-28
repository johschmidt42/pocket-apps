import { MUZZLE_Y } from "../content/tuning.ts";
import { seedsOf, SEED_SHOOTER } from "../content/weapons.ts";
import type { SimEvent } from "./events.ts";
import { FIELD, TICK_SECONDS, TICKS_PER_SECOND } from "./field.ts";
import type { GameState } from "./state.ts";

/**
 * The "Kernspucker" for one tick. A shot takes one stone from the drum. Without shots, the drum
 * fills again, stone by stone. An empty drum locks the weapon until the drum is full, as the tank does.
 */
export function shoot(state: GameState, wanted: boolean, events: SimEvent[]): void {
  const { player } = state;
  const weapon = SEED_SHOOTER;
  if (player.shotTicks > 0) player.shotTicks -= 1;
  if (player.drumLocked && player.seeds >= weapon.seeds) player.drumLocked = false;

  const shoots = wanted && !player.drumLocked && player.seeds > 0;
  if (shoots) {
    player.idleTicks = 0;
    // The player holds the button, but the last shot was a moment ago.
    if (player.shotTicks > 0) return;
    const { count, damage } = seedsOf(player.level);
    for (let index = 0; index < count; index++) {
      const x = player.x + (index - (count - 1) / 2) * weapon.gap;
      const y = player.y + MUZZLE_Y;
      state.seeds.push({
        x,
        y,
        prevX: x,
        prevY: y,
        speedY: weapon.speed,
        radius: weapon.radius,
        damage,
      });
    }
    player.seeds -= 1;
    player.shotTicks = Math.round(TICKS_PER_SECOND / weapon.shotsPerSecond);
    events.push({ type: "seed-shot" });
    if (player.seeds === 0) {
      player.drumLocked = true;
      events.push({ type: "drum-empty" });
    }
    return;
  }

  player.idleTicks += 1;
  if (player.seeds >= weapon.seeds) return;
  // An empty drum fills at once. A drum with stones waits a moment first.
  const delay = player.drumLocked ? 0 : Math.round(weapon.refillDelaySeconds * TICKS_PER_SECOND);
  const perStone = Math.round((weapon.refillSeconds / weapon.seeds) * TICKS_PER_SECOND);
  const waited = player.idleTicks - delay;
  if (waited > 0 && waited % perStone === 0) player.seeds += 1;
}

/** Moves each stone for one tick. A stone over the field goes away. */
export function moveSeeds(state: GameState): void {
  const top = FIELD.height / 2 + 40;
  let kept = 0;
  for (const seed of state.seeds) {
    seed.prevX = seed.x;
    seed.prevY = seed.y;
    seed.y += seed.speedY * TICK_SECONDS;
    if (seed.y > top) continue;
    state.seeds[kept] = seed;
    kept += 1;
  }
  state.seeds.length = kept;
}
