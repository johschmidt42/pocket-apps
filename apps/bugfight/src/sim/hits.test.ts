import { expect, test } from "vitest";
import { ANT } from "../content/enemies.ts";
import { PLAYER } from "../content/tuning.ts";
import { FIRST_WAVE } from "../content/waves.ts";
import type { SimEvent } from "./events.ts";
import { TICKS_PER_SECOND } from "./field.ts";
import { NO_INPUT } from "./input.ts";
import { createState, type Drop, type Enemy, type GameState, type Puff } from "./state.ts";
import { step } from "./step.ts";

/** A game with one ant that stays at its place and never spits. */
function oneAnt(): { state: GameState; ant: Enemy } {
  const state = createState(1, { ...FIRST_WAVE, columns: 1, rows: 1, swayDistance: 0 });
  const ant = state.enemies[0]!;
  ant.state = "formation";
  // A random number is never this small: the ant does not spit.
  state.seed = 0;
  return { state, ant };
}

/** A puff that stays at this place for a long time. */
function puffAt(x: number, y: number): Puff {
  return {
    x,
    y,
    prevX: x,
    prevY: y,
    speedX: 0,
    speedY: 0,
    age: 0,
    life: 100000,
    radius: 30,
    startRadius: 30,
    endRadius: 30,
    damage: 1,
    look: 0,
  };
}

function dropAt(x: number, y: number): Drop {
  return { x, y, prevX: x, prevY: y, speedY: 0, radius: ANT.spit.radius };
}

function run(state: GameState, seconds: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let tick = 0; tick < Math.round(seconds * TICKS_PER_SECOND); tick++) {
    events.push(...step(state, NO_INPUT));
  }
  return events;
}

/** The place of the ant of `oneAnt()`. */
const PLACE = { x: 0, y: FIRST_WAVE.top };

test("an ant in the gas takes damage ten times per second", () => {
  const { state, ant } = oneAnt();
  state.puffs.push(puffAt(PLACE.x + 40, PLACE.y));
  const events = run(state, 0.55);
  expect(ant.hitPoints).toBe(ANT.hitPoints - 6);
  expect(events.filter((event) => event.type === "enemy-hit")).toHaveLength(6);
});

test("more puffs on an ant do not hurt more", () => {
  const { state, ant } = oneAnt();
  for (let count = 0; count < 5; count++) state.puffs.push(puffAt(PLACE.x, PLACE.y));
  run(state, 0.55);
  expect(ant.hitPoints).toBe(ANT.hitPoints - 6);
});

test("a puff that does not touch the ant does not hurt it", () => {
  const { state, ant } = oneAnt();
  state.puffs.push(puffAt(PLACE.x + 30 + ANT.radius + 2, PLACE.y));
  run(state, 1);
  expect(ant.hitPoints).toBe(ANT.hitPoints);
});

test("an ant that waits out of the field cannot take damage", () => {
  const state = createState();
  const ant = state.enemies.at(-1)!;
  state.puffs.push(puffAt(ant.x, ant.y));
  run(state, 0.05);
  expect(ant.hitPoints).toBe(ANT.hitPoints);
});

test("an ant without hit points dies, and the last death wins the game", () => {
  const { state, ant } = oneAnt();
  state.puffs.push(puffAt(PLACE.x, PLACE.y));
  const events = run(state, 1);
  expect(state.enemies).toHaveLength(0);
  expect(events).toContainEqual({ type: "enemy-died", id: ant.id, x: PLACE.x, y: PLACE.y });
  expect(events.filter((event) => event.type === "wave-cleared")).toHaveLength(1);
  expect(state.over).toBe("won");
});

test("a drop that touches Seven costs one spot and is gone", () => {
  const { state } = oneAnt();
  state.drops.push(dropAt(state.player.x + 10, state.player.y));
  expect(step(state, NO_INPUT)).toEqual([{ type: "player-hit" }]);
  expect(state.player.spots).toBe(PLAYER.spots - 1);
  expect(state.drops).toHaveLength(0);
});

test("a drop that does not touch Seven does not hurt him", () => {
  const { state } = oneAnt();
  state.drops.push(dropAt(state.player.x + 40, state.player.y));
  step(state, NO_INPUT);
  expect(state.player.spots).toBe(PLAYER.spots);
  expect(state.drops).toHaveLength(1);
});

test("after a hit, nothing hurts Seven for a time", () => {
  const { state } = oneAnt();
  state.drops.push(dropAt(state.player.x, state.player.y));
  step(state, NO_INPUT);
  state.drops.push(dropAt(state.player.x, state.player.y));
  run(state, PLAYER.safeSeconds - 0.1);
  expect(state.player.spots).toBe(PLAYER.spots - 1);
  run(state, 0.2);
  expect(state.player.spots).toBe(PLAYER.spots - 2);
});

test("the body of an ant hurts Seven", () => {
  const { state } = oneAnt();
  state.player.x = PLACE.x + 20;
  state.player.y = PLACE.y;
  expect(step(state, NO_INPUT)).toContainEqual({ type: "player-hit" });
});

test("the last spot ends the game: Seven does not move or spray", () => {
  const { state } = oneAnt();
  state.player.spots = 1;
  state.drops.push(dropAt(state.player.x, state.player.y));
  expect(step(state, NO_INPUT)).toEqual([{ type: "player-hit" }, { type: "player-died" }]);
  expect(state.over).toBe("lost");

  const place = { x: state.player.x, y: state.player.y };
  step(state, { ...NO_INPUT, moveX: 50, moveY: 50, spray: true });
  expect(state.player).toMatchObject({ ...place, spraying: false });
  expect(state.puffs).toHaveLength(0);
  // A lost game stays lost, also when the ant dies later.
  state.puffs.push(puffAt(PLACE.x, PLACE.y));
  run(state, 1.5);
  expect(state.over).toBe("lost");
});

test("with the debug option, nothing hurts Seven", () => {
  const { state } = oneAnt();
  state.player.immortal = true;
  state.drops.push(dropAt(state.player.x, state.player.y));
  run(state, 0.5);
  expect(state.player.spots).toBe(PLAYER.spots);
});
