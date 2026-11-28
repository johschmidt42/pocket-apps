import { NOZZLE, TANK } from "../content/tuning.ts";
import { powerOf, streamsOf, ZITRONELLA, type Weapon } from "../content/weapons.ts";
import type { SimEvent } from "./events.ts";
import { TICK_SECONDS, TICKS_PER_SECOND } from "./field.ts";
import { random } from "./random.ts";
import type { GameState } from "./state.ts";

/** The streams do not all make their puff in the same tick. Each stream starts this number of ticks later. */
const STREAM_SHIFT_TICKS = 2;

function emit(state: GameState, weapon: Weapon): void {
  const { player } = state;
  const interval = Math.max(Math.round(TICKS_PER_SECOND / weapon.puffsPerSecond), 1);
  const power = powerOf(player.level);
  streamsOf(player.level).forEach((stream, index) => {
    if ((state.tick + index * STREAM_SHIFT_TICKS) % interval !== 0) return;
    const angle = stream.angle + (random(state) * 2 - 1) * weapon.angleSpread;
    const speed = weapon.speed * (1 + (random(state) * 2 - 1) * weapon.speedSpread);
    const x = player.x + NOZZLE.x;
    const y = player.y + NOZZLE.y;
    const startRadius = weapon.startRadius * power.radius;
    state.puffs.push({
      x,
      y,
      prevX: x,
      prevY: y,
      speedX: Math.sin(angle) * speed,
      speedY: Math.cos(angle) * speed,
      age: 0,
      life: Math.round(weapon.seconds * TICKS_PER_SECOND),
      radius: startRadius,
      startRadius,
      endRadius: weapon.endRadius * power.radius,
      damage: weapon.damage * power.damage,
      look: random(state),
    });
  });
}

/**
 * The weapon of Seven for one tick. Spraying uses the pressure of the tank and makes puffs.
 * Without spraying, the pressure comes back. An empty tank locks the weapon until the pressure is back.
 */
export function spray(state: GameState, wanted: boolean, events: SimEvent[]): void {
  const { player } = state;
  if (player.tankLocked && player.pressure >= TANK.unlockAt) player.tankLocked = false;
  player.spraying = wanted && !player.tankLocked;
  if (!player.spraying) {
    player.pressure = Math.min(player.pressure + TICK_SECONDS / TANK.refillSeconds, 1);
    return;
  }
  emit(state, ZITRONELLA);
  player.pressure = Math.max(player.pressure - TICK_SECONDS / TANK.spraySeconds, 0);
  if (player.pressure === 0) {
    player.tankLocked = true;
    events.push({ type: "tank-empty" });
  }
}

/** Moves each puff for one tick: it becomes slower and larger. A puff at the end of its life goes away. */
export function movePuffs(state: GameState): void {
  const slower = Math.exp(-ZITRONELLA.drag * TICK_SECONDS);
  let kept = 0;
  for (const puff of state.puffs) {
    puff.age += 1;
    if (puff.age >= puff.life) continue;
    puff.prevX = puff.x;
    puff.prevY = puff.y;
    puff.x += puff.speedX * TICK_SECONDS;
    puff.y += puff.speedY * TICK_SECONDS;
    puff.speedX *= slower;
    puff.speedY *= slower;
    // The puff grows fast at first, then slowly.
    const rest = 1 - puff.age / puff.life;
    puff.radius = puff.startRadius + (puff.endRadius - puff.startRadius) * (1 - rest * rest);
    state.puffs[kept] = puff;
    kept += 1;
  }
  state.puffs.length = kept;
}
