import { ANT } from "../content/enemies.ts";
import type { Wave } from "../content/waves.ts";
import { FIELD, TICK_SECONDS, TICKS_PER_SECOND } from "./field.ts";
import { random } from "./random.ts";
import type { Enemy, GameState } from "./state.ts";

type Point = { x: number; y: number };

/** The corner out of the field from which an enemy comes. */
function cornerOf(side: -1 | 1): Point {
  return { x: side * (FIELD.width / 2 + 120), y: FIELD.height / 2 + 80 };
}

/** The enemies of a wave at the start: all wait in their corner. */
export function createEnemies(wave: Wave): Enemy[] {
  const enemies: Enemy[] = [];
  const half = wave.columns / 2;
  for (let row = 0; row < wave.rows; row++) {
    for (let column = 0; column < wave.columns; column++) {
      const side = column < half ? -1 : 1;
      // The enemies of one corner start row by row, the outer column first.
      const order = row * Math.ceil(half) + (side < 0 ? column : wave.columns - 1 - column);
      const corner = cornerOf(side);
      enemies.push({
        id: enemies.length + 1,
        x: corner.x,
        y: corner.y,
        prevX: corner.x,
        prevY: corner.y,
        hitPoints: ANT.hitPoints,
        state: "waiting",
        stateTicks: 0,
        column,
        row,
        side,
        delayTicks: Math.round(order * wave.entryGapSeconds * TICKS_PER_SECOND),
        gasTicks: 0,
      });
    }
  }
  return enemies;
}

/** The place of an enemy in the block at a tick. The block moves to the left and to the right. */
export function placeOf(wave: Wave, enemy: Enemy, tick: number): Point {
  const sway = Math.sin((2 * Math.PI * tick * TICK_SECONDS) / wave.swaySeconds) * wave.swayDistance;
  return {
    x: (enemy.column - (wave.columns - 1) / 2) * wave.spacingX + sway,
    y: wave.top - enemy.row * wave.spacingY,
  };
}

/**
 * The way from the corner to the place: the enemy dives down into the field, then it climbs to its place.
 * `part` goes from 0 (corner) to 1 (place). The way is a Bezier curve with two control points.
 */
function entryPoint(enemy: Enemy, place: Point, part: number): Point {
  const start = cornerOf(enemy.side);
  const dive = { x: enemy.side * 450, y: -480 };
  const climb = { x: place.x - enemy.side * 150, y: place.y - 380 };
  const rest = 1 - part;
  const a = rest * rest * rest;
  const b = 3 * rest * rest * part;
  const c = 3 * rest * part * part;
  const d = part * part * part;
  return {
    x: a * start.x + b * dive.x + c * climb.x + d * place.x,
    y: a * start.y + b * dive.y + c * climb.y + d * place.y,
  };
}

/** Moves each enemy for one tick, and lets enemies in the formation spit. */
export function moveEnemies(state: GameState): void {
  const { wave } = state;
  const entryTicks = Math.round(wave.entrySeconds * TICKS_PER_SECOND);
  const spitTicks = Math.round(ANT.spit.seconds * TICKS_PER_SECOND);
  const leaveTick = Math.round(ANT.spit.leaveSeconds * TICKS_PER_SECOND);
  const spitChance = TICK_SECONDS / ANT.spit.everySeconds;

  for (const enemy of state.enemies) {
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    enemy.stateTicks += 1;
    const place = placeOf(wave, enemy, state.tick);

    if (enemy.state === "waiting") {
      if (enemy.stateTicks < enemy.delayTicks) continue;
      enemy.state = "entering";
      enemy.stateTicks = 0;
    }
    if (enemy.state === "entering") {
      // Fast at first, slow at the end.
      const rest = 1 - Math.min(enemy.stateTicks / entryTicks, 1);
      const point = entryPoint(enemy, place, 1 - rest * rest);
      enemy.x = point.x;
      enemy.y = point.y;
      if (enemy.stateTicks >= entryTicks) {
        enemy.state = "formation";
        enemy.stateTicks = 0;
      }
      continue;
    }

    enemy.x = place.x;
    enemy.y = place.y;
    if (enemy.state === "formation") {
      if (state.over === null && random(state) < spitChance) {
        enemy.state = "spitting";
        enemy.stateTicks = 0;
      }
      continue;
    }
    if (enemy.stateTicks === leaveTick) {
      const y = enemy.y - ANT.radius * 0.6;
      state.drops.push({
        x: enemy.x,
        y,
        prevX: enemy.x,
        prevY: y,
        speedY: -ANT.spit.speed,
        radius: ANT.spit.radius,
      });
    }
    if (enemy.stateTicks >= spitTicks) {
      enemy.state = "formation";
      enemy.stateTicks = 0;
    }
  }
}

/** Moves each drop for one tick. A drop under the field goes away. */
export function moveDrops(state: GameState): void {
  const bottom = -FIELD.height / 2 - 40;
  let kept = 0;
  for (const drop of state.drops) {
    drop.prevX = drop.x;
    drop.prevY = drop.y;
    drop.y += drop.speedY * TICK_SECONDS;
    if (drop.y < bottom) continue;
    state.drops[kept] = drop;
    kept += 1;
  }
  state.drops.length = kept;
}
