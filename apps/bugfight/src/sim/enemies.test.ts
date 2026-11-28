import { expect, test } from "vitest";
import { ANT } from "../content/enemies.ts";
import { FIRST_WAVE } from "../content/waves.ts";
import { placeOf } from "./enemies.ts";
import { FIELD, TICKS_PER_SECOND } from "./field.ts";
import { NO_INPUT } from "./input.ts";
import { createState, type GameState } from "./state.ts";
import { step } from "./step.ts";

function run(state: GameState, seconds: number): void {
  for (let tick = 0; tick < Math.round(seconds * TICKS_PER_SECOND); tick++) step(state, NO_INPUT);
}

/** The time until the last ant is at its place: 20 ants per corner start one after the other. */
const ENTRY_SECONDS = 19 * FIRST_WAVE.entryGapSeconds + FIRST_WAVE.entrySeconds;

test("the wave has 40 ants that wait out of the field, 20 per corner", () => {
  const { enemies } = createState();
  expect(enemies).toHaveLength(40);
  expect(new Set(enemies.map((enemy) => enemy.id)).size).toBe(40);
  expect(enemies.every((enemy) => enemy.state === "waiting")).toBe(true);
  expect(enemies.every((enemy) => Math.abs(enemy.x) > FIELD.width / 2)).toBe(true);
  expect(enemies.filter((enemy) => enemy.side === -1)).toHaveLength(20);
  // The ants of one corner start one after the other.
  const delays = enemies.filter((enemy) => enemy.side === 1).map((enemy) => enemy.delayTicks);
  expect(new Set(delays).size).toBe(20);
});

test("the ants fly in one after the other and take their places in the block", () => {
  const state = createState();
  run(state, 1);
  const states = new Set(state.enemies.map((enemy) => enemy.state));
  expect(states).toEqual(new Set(["waiting", "entering"]));

  run(state, ENTRY_SECONDS - 1 + 0.1);
  for (const enemy of state.enemies) {
    expect(enemy.state === "formation" || enemy.state === "spitting").toBe(true);
    const place = placeOf(FIRST_WAVE, enemy, state.tick - 1);
    expect(enemy.x).toBeCloseTo(place.x);
    expect(enemy.y).toBeCloseTo(place.y);
  }
});

test("an ant dives into the field on its way and arrives without a jump", () => {
  const state = createState();
  const ant = state.enemies.find((enemy) => enemy.delayTicks === 0)!;
  let lowest = Infinity;
  let longestStep = 0;
  for (let tick = 0; tick < FIRST_WAVE.entrySeconds * TICKS_PER_SECOND + 5; tick++) {
    step(state, NO_INPUT);
    lowest = Math.min(lowest, ant.y);
    longestStep = Math.max(longestStep, Math.hypot(ant.x - ant.prevX, ant.y - ant.prevY));
  }
  expect(ant.state).toBe("formation");
  expect(lowest).toBeLessThan(0);
  expect(lowest).toBeGreaterThan(-FIELD.height / 2);
  // No step is longer than a fast flight: the ant never jumps.
  expect(longestStep).toBeLessThan(30);
});

test("the block is in the top half of the field and moves to both sides as one", () => {
  const state = createState();
  run(state, ENTRY_SECONDS + 0.1);
  const first = state.enemies[0]!;
  const last = state.enemies.at(-1)!;
  const gap = last.x - first.x;
  let left = Infinity;
  let right = -Infinity;
  for (let tick = 0; tick < FIRST_WAVE.swaySeconds * TICKS_PER_SECOND; tick++) {
    step(state, NO_INPUT);
    left = Math.min(left, first.x);
    right = Math.max(right, last.x);
    expect(last.x - first.x).toBeCloseTo(gap);
  }
  expect(state.enemies.every((enemy) => enemy.y > 0)).toBe(true);
  expect(left).toBeGreaterThan(-FIELD.width / 2 + ANT.radius);
  expect(right).toBeLessThan(FIELD.width / 2 - ANT.radius);
  expect(right - left).toBeGreaterThan(gap + 300);
});

test("an ant in the block spits a drop that falls straight down and leaves the field", () => {
  const state = createState();
  state.player.immortal = true;
  for (let tick = 0; tick < 20 * TICKS_PER_SECOND && state.drops.length === 0; tick++) {
    step(state, NO_INPUT);
  }
  const drop = state.drops[0];
  if (drop === undefined) throw new Error("No ant spat in 20 seconds.");
  const spitter = state.enemies.find((enemy) => enemy.state === "spitting")!;
  expect(drop.x).toBeCloseTo(spitter.x);
  expect(drop.y).toBeLessThan(spitter.y);

  const start = { x: drop.x, y: drop.y };
  run(state, 1);
  expect(drop.x).toBe(start.x);
  expect(start.y - drop.y).toBeCloseTo(ANT.spit.speed, 0);
  run(state, 4);
  expect(state.drops).not.toContain(drop);
  expect(spitter.state === "formation" || spitter.state === "spitting").toBe(true);
});

test("the ants spit about as often as their kind says", () => {
  const state = createState();
  state.player.immortal = true;
  run(state, ENTRY_SECONDS);
  let drops = 0;
  let before = state.drops.length;
  for (let tick = 0; tick < 60 * TICKS_PER_SECOND; tick++) {
    step(state, NO_INPUT);
    // A new drop is at the end of the list.
    if (state.drops.length > before) drops += state.drops.length - before;
    before = state.drops.length;
  }
  // 40 ants, each one time in 30 seconds: about 80 drops in 60 seconds.
  expect(drops).toBeGreaterThan(50);
  expect(drops).toBeLessThan(115);
});
