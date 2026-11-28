import { expect, test } from "vitest";
import { ANT } from "../content/enemies.ts";
import { SEED_SHOOTER, seedsOf } from "../content/weapons.ts";
import { FIRST_WAVE } from "../content/waves.ts";
import type { SimEvent } from "./events.ts";
import { TICKS_PER_SECOND } from "./field.ts";
import { NO_INPUT, type Input } from "./input.ts";
import { createState, type GameState } from "./state.ts";
import { step } from "./step.ts";

const FIRE: Input = { ...NO_INPUT, fire: true };

/** A game with the "Kernspucker" and one ant straight over Seven that never spits. */
function withSeeds(): GameState {
  const state = createState(1, { ...FIRST_WAVE, columns: 1, rows: 1, swayDistance: 0 });
  state.enemies[0]!.state = "formation";
  state.seed = 0;
  step(state, { ...NO_INPUT, weapon: "seeds" });
  return state;
}

function run(state: GameState, seconds: number, input: Input): SimEvent[] {
  const events: SimEvent[] = [];
  for (let tick = 0; tick < Math.round(seconds * TICKS_PER_SECOND); tick++) {
    events.push(...step(state, input));
  }
  return events;
}

const count = (events: SimEvent[], type: SimEvent["type"]) =>
  events.filter((event) => event.type === type).length;

test("a key changes the weapon, and each weapon is used only when Seven carries it", () => {
  const state = createState();
  // Seven starts with the "Kernspucker".
  expect(state.player.weapon).toBe("seeds");
  step(state, FIRE);
  expect(state.seeds).toHaveLength(1);
  expect(state.puffs).toHaveLength(0);
  step(state, { ...FIRE, weapon: "spray" });
  expect(state.player.weapon).toBe("spray");
  expect(state.player.spraying).toBe(true);
  expect(state.seeds).toHaveLength(1);
  step(state, { ...FIRE, weapon: "seeds" });
  expect(state.player.weapon).toBe("seeds");
  expect(state.player.spraying).toBe(false);
});

test("the weapon shoots at its rate, one stone of the drum per shot", () => {
  const state = withSeeds();
  state.player.x = 500;
  const events = run(state, 0.5, FIRE);
  const shots = Math.ceil(0.5 * SEED_SHOOTER.shotsPerSecond);
  expect(count(events, "seed-shot")).toBe(shots);
  expect(state.player.seeds).toBe(SEED_SHOOTER.seeds - shots);
});

test("a stone flies straight up and leaves the field", () => {
  const state = withSeeds();
  state.player.x = 500;
  step(state, FIRE);
  const stone = state.seeds[0]!;
  expect(stone.x).toBe(500);
  const startY = stone.y;
  run(state, 0.25, NO_INPUT);
  expect(stone.x).toBe(500);
  expect(stone.y - startY).toBeCloseTo(SEED_SHOOTER.speed * 0.25, 0);
  run(state, 1, NO_INPUT);
  expect(state.seeds).toHaveLength(0);
});

test("an empty drum locks the weapon until the drum is full again", () => {
  const state = withSeeds();
  state.player.x = 500;
  const emptySeconds = SEED_SHOOTER.seeds / SEED_SHOOTER.shotsPerSecond;
  const events = run(state, emptySeconds, FIRE);
  expect(count(events, "seed-shot")).toBe(SEED_SHOOTER.seeds);
  expect(count(events, "drum-empty")).toBe(1);
  expect(state.player.drumLocked).toBe(true);

  // The player holds the button. The drum fills stone by stone, and Seven does not shoot.
  const during = run(state, SEED_SHOOTER.refillSeconds * 0.5, FIRE);
  expect(count(during, "seed-shot")).toBe(0);
  expect(state.player.seeds).toBeGreaterThan(0);
  expect(state.player.seeds).toBeLessThan(SEED_SHOOTER.seeds);

  const after = run(state, SEED_SHOOTER.refillSeconds * 0.6, FIRE);
  expect(state.player.drumLocked).toBe(false);
  expect(count(after, "seed-shot")).toBeGreaterThan(0);
});

test("a drum that is not empty fills again after a short pause", () => {
  const state = withSeeds();
  state.player.x = 500;
  run(state, 0.5, FIRE);
  const left = state.player.seeds;
  expect(left).toBeLessThan(SEED_SHOOTER.seeds);
  run(state, SEED_SHOOTER.refillDelaySeconds - 0.05, NO_INPUT);
  expect(state.player.seeds).toBe(left);
  run(state, SEED_SHOOTER.refillSeconds, NO_INPUT);
  expect(state.player.seeds).toBe(SEED_SHOOTER.seeds);
});

test("a stone hurts the first enemy that it touches and is gone", () => {
  const state = withSeeds();
  const ant = state.enemies[0]!;
  // An enemy that is harder than an ant: it lives on after one stone.
  ant.hitPoints = 20;
  step(state, FIRE);
  const events = run(state, 0.5, NO_INPUT);
  expect(ant.hitPoints).toBe(20 - SEED_SHOOTER.damage);
  expect(count(events, "enemy-hit")).toBe(1);
  expect(state.seeds).toHaveLength(0);
});

test("one stone kills an ant, and the last ant wins the game", () => {
  const state = withSeeds();
  expect(SEED_SHOOTER.damage).toBeGreaterThanOrEqual(ANT.hitPoints);
  step(state, FIRE);
  const events = run(state, 0.5, NO_INPUT);
  expect(count(events, "enemy-died")).toBe(1);
  expect(state.enemies).toHaveLength(0);
  expect(state.over).toBe("won");
});

test("a higher level makes the stones stronger and adds stones side by side", () => {
  expect(seedsOf(1)).toEqual({ count: 1, damage: 8 });
  expect(seedsOf(3)).toEqual({ count: 1, damage: 12 });
  expect(seedsOf(4).count).toBe(2);
  expect(seedsOf(7).count).toBe(3);
  expect(seedsOf(10)).toEqual({ count: 4, damage: 26 });

  const state = withSeeds();
  state.player.x = 500;
  state.player.level = 7;
  step(state, FIRE);
  expect(state.seeds.map((stone) => stone.x)).toEqual([484, 500, 516]);
  expect(state.player.seeds).toBe(SEED_SHOOTER.seeds - 1);
});

test("the weapon that Seven does not carry fills again", () => {
  const state = withSeeds();
  state.player.x = 500;
  run(state, 0.7, FIRE);
  expect(state.player.seeds).toBeLessThan(SEED_SHOOTER.seeds);
  // Seven changes to the gas and sprays. The drum fills in this time.
  step(state, { ...NO_INPUT, weapon: "spray" });
  run(state, 2, FIRE);
  expect(state.player.seeds).toBe(SEED_SHOOTER.seeds);
  expect(state.player.pressure).toBeLessThan(1);
});
