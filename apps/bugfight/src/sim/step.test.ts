import { expect, test } from "vitest";
import { FIELD } from "./field.ts";
import { NO_INPUT } from "./input.ts";
import { createState, PLAYER_MARGIN } from "./state.ts";
import { step } from "./step.ts";

test("Seven starts at the bottom center", () => {
  const state = createState();
  expect(state.player.x).toBe(0);
  expect(state.player.y).toBeLessThan(0);
  expect(state.tick).toBe(0);
});

test("a tick moves Seven by the move of the input", () => {
  const state = createState();
  const startY = state.player.y;
  step(state, { ...NO_INPUT, moveX: 12, moveY: -5 });
  expect(state.player).toMatchObject({ x: 12, y: startY - 5 });
  expect(state.tick).toBe(1);
});

test("without input, Seven stays where he is", () => {
  const state = createState();
  step(state, { ...NO_INPUT, moveX: 30 });
  step(state, NO_INPUT);
  expect(state.player.x).toBe(30);
});

test("the field stops Seven at its edges", () => {
  const state = createState();
  step(state, { ...NO_INPUT, moveX: 5000, moveY: 5000 });
  expect(state.player.x).toBe(FIELD.width / 2 - PLAYER_MARGIN);
  expect(state.player.y).toBe(FIELD.height / 2 - PLAYER_MARGIN);
  step(state, { ...NO_INPUT, moveX: -9000, moveY: -9000 });
  expect(state.player.x).toBe(-FIELD.width / 2 + PLAYER_MARGIN);
  expect(state.player.y).toBe(-FIELD.height / 2 + PLAYER_MARGIN);
});

test("the same inputs give the same state", () => {
  const run = () => {
    const state = createState();
    for (let tick = 0; tick < 500; tick++) {
      step(state, { ...NO_INPUT, moveX: Math.sin(tick / 9) * 14, moveY: Math.cos(tick / 5) * 6 });
    }
    return state;
  };
  expect(run()).toEqual(run());
});
