import { expect, test } from "vitest";
import type { WeaponName } from "../content/weapons.ts";
import { createBot } from "./bot.ts";
import { TICKS_PER_SECOND } from "./field.ts";
import { NO_INPUT, type Input } from "./input.ts";
import { createState, type GameState } from "./state.ts";
import { step } from "./step.ts";

/** Plays a game until it is over or the time ends. Returns the state and the seconds that the game took. */
function play(
  seed: number,
  input: (state: GameState) => Input,
  mostSeconds: number,
  weapon: WeaponName = "seeds",
) {
  const state = createState(seed);
  state.player.weapon = weapon;
  while (state.over === null && state.tick < mostSeconds * TICKS_PER_SECOND) {
    step(state, input(state));
  }
  return { state, seconds: state.tick / TICKS_PER_SECOND };
}

const GAMES = (["seeds", "spray"] satisfies WeaponName[]).flatMap((weapon) =>
  [1, 2, 3, 4, 5].map((seed) => ({ weapon, seed })),
);

test.each(GAMES)("the bot wins the first wave with $weapon (seed $seed)", ({ weapon, seed }) => {
  const { state, seconds } = play(seed, createBot(), 150, weapon);
  expect(state.over).toBe("won");
  expect(state.player.spots).toBeGreaterThan(0);
  // The wave is not over at once, and it does not take forever.
  expect(seconds).toBeGreaterThan(8);
  expect(seconds).toBeLessThan(120);
});

test("a player that does nothing loses", () => {
  const { state } = play(1, () => NO_INPUT, 900);
  expect(state.over).toBe("lost");
  expect(state.enemies).toHaveLength(40);
});

test("the same seed and the same player give the same game", () => {
  const first = play(7, createBot(), 30);
  const second = play(7, createBot(), 30);
  expect(second.state).toEqual(first.state);
  expect(play(8, createBot(), 30).state).not.toEqual(first.state);
});
