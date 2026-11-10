import { describe, expect, it } from "vitest";
import { seededRandom } from "./seeded-random.ts";

describe("seededRandom", () => {
  it("gives the same numbers for the same seed", () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("gives numbers from 0 to below 1", () => {
    const random = seededRandom(1);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
