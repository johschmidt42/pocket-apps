import { TICK_SECONDS } from "./field.ts";
import type { Input } from "./input.ts";
import type { GameState } from "./state.ts";

/** The speed of the bot in field units per second. A person with a mouse is much faster. */
const SPEED = 700;
/** The bot flies at this height. From here, the gas reaches the top row. */
const HEIGHT = -140;

/**
 * A simple written player. The tests use it to check that a wave is possible,
 * and the address `?bot` lets it play in the browser.
 * It flies under the nearest enemy, sprays in bursts, and moves away from drops.
 */
export function createBot(): (state: GameState) => Input {
  /** True while the bot waits for the tank. */
  let resting = false;
  return (state) => {
    const { player } = state;
    if (player.pressure < 0.12) resting = true;
    if (player.pressure > 0.7) resting = false;

    const targets = state.enemies.filter((enemy) => enemy.state !== "waiting");
    let wantX = player.x;
    let wantY = HEIGHT;
    let nearest = Infinity;
    for (const enemy of targets) {
      const distance = Math.abs(enemy.x - player.x);
      if (distance < nearest) {
        nearest = distance;
        wantX = enemy.x;
      }
      // An enemy on its way in comes near: go down, out of its way.
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 110) wantY = HEIGHT - 200;
    }
    const aimed = nearest < 50;

    // A drop over the bot: go to the side.
    for (const drop of state.drops) {
      const above = drop.y - player.y;
      if (above > -20 && above < 240 && Math.abs(drop.x - player.x) < 50) {
        wantX = drop.x + (player.x >= drop.x ? 95 : -95);
      }
    }

    const most = SPEED * TICK_SECONDS;
    const dx = wantX - player.x;
    const dy = wantY - player.y;
    const distance = Math.hypot(dx, dy);
    const part = distance > most ? most / distance : 1;
    return {
      moveX: dx * part,
      moveY: dy * part,
      fire: aimed && !resting,
      weapon: null,
    };
  };
}
