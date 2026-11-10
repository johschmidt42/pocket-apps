import { describe, expect, it } from "vitest";
import type { Params } from "./attractors.ts";
import { createDrift, lerpParams, paramValues } from "./drift.ts";

const A: Params = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };
const B: Params = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };

describe("lerpParams", () => {
  it("mixes two parameter sets", () => {
    expect(lerpParams(A, B, 0.5)).toEqual({ a: 0.5, b: 1, c: 1.5, d: 2, e: 2.5, f: 3 });
  });
});

describe("createDrift", () => {
  it("keeps the parameters with one profile", () => {
    const drift = createDrift([B], Math.random);
    expect(drift.update(1000)).toBe(B);
  });

  it("moves from the first to the second profile in 120 seconds", () => {
    const drift = createDrift([A, B], () => 0);
    expect(drift.update(0)).toEqual(A);
    // The first move starts fast: sin(π/4) after half the time.
    expect(drift.update(60).a).toBeCloseTo(Math.sin(Math.PI / 4));
    expect(drift.update(60)).toEqual(B);
  });

  it("then moves to a random mix of profiles, smooth at start and end", () => {
    // random() = 0: both picks are A, the mix is A, the move takes 180 seconds.
    const drift = createDrift([A, B], () => 0);
    drift.update(120);
    expect(drift.update(90).a).toBeCloseTo(0.5);
    expect(drift.update(90)).toEqual(A);
  });

  it("uses the first profile if the random number is 1", () => {
    const drift = createDrift([B, A], () => 1);
    drift.update(120);
    expect(drift.update(360)).toEqual(B);
  });
});

describe("paramValues", () => {
  it("gives the shown parameters with their symbols", () => {
    expect(
      paramValues(B, [
        { key: "a", symbol: "σ", meaning: "Erster Wert." },
        { key: "c", symbol: "β", meaning: "Dritter Wert." },
      ]),
    ).toEqual([
      { symbol: "σ", value: 1 },
      { symbol: "β", value: 3 },
    ]);
  });
});
