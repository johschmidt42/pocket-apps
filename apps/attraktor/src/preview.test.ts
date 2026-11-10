import { describe, expect, it } from "vitest";
import { ATTRACTORS } from "./attractors.ts";
import { previewPath } from "./preview.ts";

describe("previewPath", () => {
  it.each(ATTRACTORS.map((attractor) => [attractor.name, attractor] as const))(
    "draws %s inside the view box",
    (_name, attractor) => {
      const path = previewPath(attractor, 3000);
      expect(path.startsWith("M")).toBe(true);
      const numbers = path
        .split(/[ML ]/)
        .filter((part) => part !== "")
        .map(Number);
      // Every third step is a point with two numbers.
      expect(numbers).toHaveLength(2 * 1000);
      for (const value of numbers) expect(Math.abs(value)).toBeLessThan(3);
    },
  );

  it("draws the same path each time", () => {
    const [first] = ATTRACTORS;
    expect(previewPath(first!, 300)).toBe(previewPath(first!, 300));
  });
});
