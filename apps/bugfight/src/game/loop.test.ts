import { expect, test } from "vitest";
import { createLoop } from "./loop.ts";

const TICK = 1 / 120;

test("a monitor with 60 Hz gets two ticks per picture", () => {
  const loop = createLoop(TICK);
  expect(loop.advance(1 / 60).ticks).toBe(2);
  expect(loop.advance(1 / 60).ticks).toBe(2);
});

test("a monitor with 120 Hz gets one tick per picture", () => {
  const loop = createLoop(TICK);
  expect(loop.advance(1 / 120)).toEqual({ ticks: 1, alpha: 0, seconds: 1 / 120 });
});

test("a monitor with 144 Hz gets 120 ticks in one second", () => {
  const loop = createLoop(TICK);
  let ticks = 0;
  for (let picture = 0; picture < 144; picture++) ticks += loop.advance(1 / 144).ticks;
  expect(ticks).toBe(120);
});

test("alpha says how far the time is between two ticks", () => {
  const loop = createLoop(TICK);
  const frame = loop.advance(TICK * 1.5);
  expect(frame.ticks).toBe(1);
  expect(frame.alpha).toBeCloseTo(0.5);
});

test("a long gap counts only as 0.1 second", () => {
  const loop = createLoop(TICK);
  expect(loop.advance(5).ticks).toBe(12);
});

test("slow motion makes fewer ticks", () => {
  const loop = createLoop(TICK);
  loop.setTimeFactor(0.5);
  expect(loop.advance(1 / 60)).toMatchObject({ ticks: 1, seconds: 1 / 120 });
});

test("a time factor of zero holds the game", () => {
  const loop = createLoop(TICK);
  loop.setTimeFactor(0);
  expect(loop.advance(0.1)).toEqual({ ticks: 0, alpha: 0, seconds: 0 });
});

test("a hit stop holds the game for its time, then the game continues", () => {
  const loop = createLoop(TICK);
  loop.hitStop(0.05);
  expect(loop.advance(0.03)).toMatchObject({ ticks: 0, seconds: 0 });
  // 0.02 second of the stop is left. The other 0.03 second gives 3 ticks, and a part of a tick is left.
  expect(loop.advance(0.05).ticks).toBe(3);
  expect(loop.advance(TICK).ticks).toBe(1);
});
