import { expect, test } from "vitest";
import { TANK } from "../content/tuning.ts";
import { ZITRONELLA } from "../content/weapons.ts";
import type { SimEvent } from "./events.ts";
import { TICKS_PER_SECOND } from "./field.ts";
import { NO_INPUT, type Input } from "./input.ts";
import { createState, type GameState } from "./state.ts";
import { step } from "./step.ts";

const SPRAY: Input = { ...NO_INPUT, fire: true };

/** A game in which Seven carries the gas spray. */
function withGas(seed?: number): GameState {
  const state = createState(seed);
  state.player.weapon = "spray";
  return state;
}

/** Runs the sim for this time with one input. Returns all events. */
function run(state: GameState, seconds: number, input: Input): SimEvent[] {
  const events: SimEvent[] = [];
  for (let tick = 0; tick < Math.round(seconds * TICKS_PER_SECOND); tick++) {
    events.push(...step(state, input));
  }
  return events;
}

test("Seven sprays only while the player wants it", () => {
  const state = withGas();
  run(state, 0.5, NO_INPUT);
  expect(state.puffs).toHaveLength(0);
  expect(state.player.spraying).toBe(false);
  run(state, 0.5, SPRAY);
  expect(state.player.spraying).toBe(true);
  // Level 1 has one stream.
  expect(state.puffs).toHaveLength(ZITRONELLA.puffsPerSecond * 0.5);
});

test("a puff starts at the nozzle, flies up, becomes slower and larger, and goes away", () => {
  const state = withGas();
  const startY = state.player.y;
  step(state, SPRAY);
  const puff = state.puffs[0]!;
  expect(puff.x).toBe(state.player.x);
  expect(puff.y).toBeGreaterThan(startY);
  const first = { y: puff.y, speedY: puff.speedY, radius: puff.radius };
  run(state, 0.5, NO_INPUT);
  expect(puff.y).toBeGreaterThan(first.y + 120);
  expect(puff.speedY).toBeLessThan(first.speedY / 2);
  expect(puff.speedY).toBeGreaterThan(0);
  expect(puff.radius).toBeGreaterThan(first.radius * 2);
  expect(puff.prevY).toBeLessThan(puff.y);
  run(state, ZITRONELLA.seconds, NO_INPUT);
  expect(state.puffs).toHaveLength(0);
});

test("the gas has a short reach: about a quarter of the height of the field", () => {
  const state = withGas();
  const startY = state.player.y;
  step(state, SPRAY);
  const puff = state.puffs[0]!;
  run(state, ZITRONELLA.seconds - 0.05, NO_INPUT);
  expect(puff.y - startY).toBeGreaterThan(220);
  expect(puff.y - startY).toBeLessThan(340);
});

test("spraying uses the pressure, and a pause brings it back", () => {
  const state = withGas();
  run(state, 1, SPRAY);
  expect(state.player.pressure).toBeCloseTo(1 - 1 / TANK.spraySeconds);
  run(state, TANK.refillSeconds, NO_INPUT);
  expect(state.player.pressure).toBe(1);
});

test("an empty tank locks the weapon until the tank is full again", () => {
  const state = withGas();
  const events = run(state, TANK.spraySeconds + 0.1, SPRAY);
  expect(events.filter((event) => event.type === "tank-empty")).toHaveLength(1);
  expect(state.player.tankLocked).toBe(true);
  expect(state.player.spraying).toBe(false);

  // The player holds the button. The tank fills, but Seven does not spray.
  const before = state.puffs.length;
  run(state, 0.3, SPRAY);
  expect(state.player.tankLocked).toBe(true);
  expect(state.puffs.length).toBeLessThan(before);

  run(state, TANK.refillSeconds * TANK.unlockAt, SPRAY);
  expect(state.player.tankLocked).toBe(false);
  expect(state.player.spraying).toBe(true);
});

test("a higher level sprays more streams in a wider fan", () => {
  const spread = (level: number) => {
    const state = withGas();
    state.player.level = level;
    run(state, 0.6, SPRAY);
    const xs = state.puffs.map((puff) => puff.x);
    return { count: state.puffs.length, width: Math.max(...xs) - Math.min(...xs) };
  };
  expect(spread(5).count).toBe(spread(1).count * 5);
  expect(spread(5).width).toBeGreaterThan(spread(1).width * 3);
});

test("the same seed and the same inputs give the same gas, another seed gives other gas", () => {
  const play = (seed: number) => {
    const state = withGas(seed);
    for (let tick = 0; tick < 400; tick++) {
      step(state, { ...NO_INPUT, moveX: Math.sin(tick / 20) * 5, fire: tick % 90 < 60 });
    }
    return state;
  };
  expect(play(3)).toEqual(play(3));
  expect(play(3).puffs).not.toEqual(play(4).puffs);
});

test("the number of puffs stays small when the player sprays without end", () => {
  const state = withGas();
  state.player.level = 10;
  let most = 0;
  for (let tick = 0; tick < 30 * TICKS_PER_SECOND; tick++) {
    step(state, SPRAY);
    most = Math.max(most, state.puffs.length);
  }
  // 10 streams. An empty tank makes pauses.
  const full = 10 * ZITRONELLA.puffsPerSecond * ZITRONELLA.seconds;
  expect(most).toBeLessThanOrEqual(full + 10);
  expect(most).toBeGreaterThan(full * 0.9);
});
