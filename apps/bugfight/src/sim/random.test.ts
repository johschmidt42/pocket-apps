import { expect, test } from "vitest";
import { random } from "./random.ts";

test("the same seed gives the same numbers", () => {
  const a = { seed: 42 };
  const b = { seed: 42 };
  const numbers = Array.from({ length: 20 }, () => random(a));
  expect(Array.from({ length: 20 }, () => random(b))).toEqual(numbers);
  expect(new Set(numbers).size).toBe(20);
});

test("another seed gives other numbers", () => {
  expect(random({ seed: 1 })).not.toBe(random({ seed: 2 }));
});

test("the numbers are from 0 to 1 and fill the range", () => {
  const state = { seed: 7 };
  const numbers = Array.from({ length: 2000 }, () => random(state));
  expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...numbers)).toBeLessThan(1);
  expect(Math.min(...numbers)).toBeLessThan(0.01);
  expect(Math.max(...numbers)).toBeGreaterThan(0.99);
  const mean = numbers.reduce((sum, number) => sum + number, 0) / numbers.length;
  expect(mean).toBeCloseTo(0.5, 1);
});
