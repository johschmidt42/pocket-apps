import { expect, test } from "vitest";
import { LOOT } from "../content/tuning.ts";
import { FIRST_WAVE } from "../content/waves.ts";
import type { SimEvent } from "./events.ts";
import { FIELD, TICKS_PER_SECOND } from "./field.ts";
import { NO_INPUT } from "./input.ts";
import { dropLoot } from "./loot.ts";
import { createState, type GameState, type Loot } from "./state.ts";
import { step } from "./step.ts";

const FLOOR = -FIELD.height / 2;

/** A game with one ant far away that never spits, and Seven in the bottom left corner. */
function emptyField(): GameState {
  const state = createState(1, { ...FIRST_WAVE, columns: 1, rows: 1, swayDistance: 0 });
  state.enemies[0]!.state = "formation";
  state.player.x = -700;
  state.player.y = -400;
  return state;
}

/** One grain of pollen at this place, with no speed. */
function grainAt(x: number, y: number, grains = 1): Loot {
  return {
    x,
    y,
    prevX: x,
    prevY: y,
    speedX: 0,
    speedY: 0,
    grains,
    radius: 9,
    bounces: 0,
    restTicks: 0,
  };
}

/** Runs the sim. A random number is never this small, so the ant does not spit. */
function run(state: GameState, seconds: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let tick = 0; tick < Math.round(seconds * TICKS_PER_SECOND); tick++) {
    state.seed = 0;
    events.push(...step(state, NO_INPUT));
  }
  return events;
}

test("about each fourth dead enemy drops pollen, most of the time one grain", () => {
  const state = emptyField();
  const deaths = 4000;
  for (let death = 0; death < deaths; death++) dropLoot(state, 0, 0);
  expect(state.loot.length / deaths).toBeGreaterThan(LOOT.chance - 0.03);
  expect(state.loot.length / deaths).toBeLessThan(LOOT.chance + 0.03);

  const part = (grains: number) =>
    state.loot.filter((clump) => clump.grains === grains).length / state.loot.length;
  expect(part(1)).toBeCloseTo(0.6, 1);
  expect(part(2)).toBeCloseTo(0.25, 1);
  expect(part(3)).toBeCloseTo(0.1, 1);
  expect(part(4)).toBeCloseTo(0.05, 1);
  expect(part(1) + part(2) + part(3) + part(4)).toBeCloseTo(1);
  // A bigger clump has a bigger radius.
  const radius = (grains: number) => state.loot.find((clump) => clump.grains === grains)!.radius;
  expect(radius(4)).toBeGreaterThan(radius(1));
});

test("the shares of the clumps add up to all drops", () => {
  const sum = LOOT.clumps.reduce((total, [, share]) => total + share, 0);
  expect(sum).toBeCloseTo(1);
});

test("a dead ant can drop pollen at its place", () => {
  // With this seed, the first death drops pollen.
  const seed = Array.from({ length: 50 }, (_, index) => index + 1).find((candidate) => {
    const state = emptyField();
    state.seed = candidate;
    dropLoot(state, 5, 6);
    return state.loot.length === 1;
  });
  expect(seed).toBeDefined();
});

test("a clump falls, hops at the bottom edge each time less high, lies still and goes away", () => {
  const state = emptyField();
  const clump = grainAt(300, 0);
  state.loot.push(clump);

  /** The highest place of each flight between two contacts with the bottom edge. */
  const tops: number[] = [];
  let top = -Infinity;
  let bounces = 0;
  for (let tick = 0; tick < 8 * TICKS_PER_SECOND && clump.restTicks === 0; tick++) {
    run(state, 1 / TICKS_PER_SECOND);
    top = Math.max(top, clump.y);
    if (clump.bounces > bounces) {
      bounces = clump.bounces;
      tops.push(top);
      top = -Infinity;
    }
  }
  expect(clump.bounces).toBe(LOOT.bounces);
  // The first top is the start. Each hop after it is lower.
  expect(tops).toHaveLength(3);
  expect(tops[1]).toBeLessThan(tops[0]!);
  expect(tops[2]).toBeLessThan(tops[1]!);
  expect(tops[2]).toBeGreaterThan(FLOOR + 20);

  // It lies at the bottom edge now.
  expect(clump.y).toBeCloseTo(FLOOR + clump.radius);
  run(state, LOOT.restSeconds - 0.1);
  expect(state.loot).toContain(clump);
  run(state, 0.2);
  expect(state.loot).toHaveLength(0);
  expect(state.score).toBe(0);
});

test("the side edges of the field send a clump back", () => {
  const state = emptyField();
  const clump = { ...grainAt(FIELD.width / 2 - 20, 300), speedX: 400 };
  state.loot.push(clump);
  run(state, 0.3);
  expect(clump.speedX).toBeLessThan(0);
  expect(clump.x).toBeLessThanOrEqual(FIELD.width / 2 - clump.radius);
});

test("Seven collects a clump that he touches: each grain is one point", () => {
  const state = emptyField();
  state.loot.push(grainAt(state.player.x + 15, state.player.y, 3));
  const events = run(state, 1 / TICKS_PER_SECOND);
  expect(state.loot).toHaveLength(0);
  expect(state.score).toBe(3);
  expect(events).toContainEqual(expect.objectContaining({ type: "loot-collected", grains: 3 }));
});

test("near Seven, a clump flies to him", () => {
  const state = emptyField();
  const clump = grainAt(state.player.x + LOOT.magnetDistance - 5, state.player.y + 10);
  state.loot.push(clump);
  run(state, 2 / TICKS_PER_SECOND);
  expect(clump.x).toBeLessThan(state.player.x + LOOT.magnetDistance - 10);
  run(state, 0.3);
  expect(state.loot).toHaveLength(0);
  expect(state.score).toBe(1);
});

test("a clump that is far from Seven does not fly to him", () => {
  const state = emptyField();
  const clump = grainAt(state.player.x + LOOT.magnetDistance + 60, FLOOR + 9);
  state.loot.push(clump);
  run(state, 0.1);
  expect(clump.x).toBe(state.player.x + LOOT.magnetDistance + 60);
});

test("a dead Seven collects nothing", () => {
  const state = emptyField();
  state.over = "lost";
  state.loot.push(grainAt(state.player.x, state.player.y));
  run(state, 0.2);
  expect(state.score).toBe(0);
});
