import { describe, expect, it } from "vitest";
import { beltMarks } from "./belt.ts";

const places = (path: string) =>
  [...path.matchAll(/M (-?[\d.]+)/g)].map((match) => Number(match[1]));

describe("beltMarks", () => {
  it("draws marks only between the two edges", () => {
    for (const x of places(beltMarks(168, 0.3, 20, 150))) {
      expect(x).toBeGreaterThanOrEqual(20);
      expect(x).toBeLessThanOrEqual(150);
    }
  });

  it("moves the marks back", () => {
    const [first] = places(beltMarks(168, 0.1, 20, 150));
    const [later] = places(beltMarks(168, 0.11, 20, 150));
    expect(later).toBeCloseTo(first! - 1.68, 1);
  });

  it.each([172.8, 115, 168])("has no jump where the loop of %d starts again", (distance) => {
    const start = places(beltMarks(distance, 0, 20, 150));
    const end = places(beltMarks(distance, 0.999999, 20, 150));
    expect(end).toHaveLength(start.length);
    end.forEach((x, index) => {
      expect(x).toBeCloseTo(start[index]!, 1);
    });
  });

  it("keeps moving after the first loop", () => {
    expect(beltMarks(168, 1.25, 20, 150)).toBe(beltMarks(168, 0.25, 20, 150));
  });
});
