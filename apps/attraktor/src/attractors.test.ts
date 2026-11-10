import { describe, expect, it } from "vitest";
import { ATTRACTORS, type MutableVec3 } from "./attractors.ts";
import { PALETTES } from "./palettes.ts";

describe("ATTRACTORS", () => {
  it("has six attractors with different ids and known palettes", () => {
    const ids = ATTRACTORS.map((attractor) => attractor.id);
    expect(new Set(ids).size).toBe(6);
    const palettes = PALETTES.map((palette) => palette.id);
    for (const attractor of ATTRACTORS) expect(palettes).toContain(attractor.palette);
  });

  it.each(ATTRACTORS.map((attractor) => [attractor.name, attractor] as const))(
    "%s stays in the picture from its seed",
    (_name, attractor) => {
      const { center, scale, dt, seed, derivative } = attractor;
      const velocity: MutableVec3 = { x: 0, y: 0, z: 0 };
      let [x, y, z] = seed;
      let maxRadius = 0;
      for (let s = 0; s < 20000; s++) {
        derivative(x, y, z, attractor.profiles[0], velocity);
        x += velocity.x * dt;
        y += velocity.y * dt;
        z += velocity.z * dt;
        if (s < 2000) continue;
        const radius = Math.hypot(
          (x - center[0]) * scale,
          (y - center[1]) * scale,
          (z - center[2]) * scale,
        );
        maxRadius = Math.max(maxRadius, radius);
      }
      // Big enough to fill the picture, and inside the escape radius of 4.5.
      expect(maxRadius).toBeGreaterThan(1.2);
      expect(maxRadius).toBeLessThan(4.5);
    },
  );

  it("explains each attractor and each parameter", () => {
    for (const attractor of ATTRACTORS) {
      expect(attractor.about).not.toBe("");
      expect(attractor.equations.map((line) => line.slice(0, 6))).toEqual([
        "dx/dt ",
        "dy/dt ",
        "dz/dt ",
      ]);
      for (const { symbol, meaning } of attractor.symbols) {
        // Each shown parameter appears in the formulas.
        expect(attractor.equations.join(" ")).toContain(symbol);
        expect(meaning).not.toBe("");
      }
    }
  });

  it("shows all parameters that the formula uses", () => {
    for (const attractor of ATTRACTORS) {
      const used = attractor.symbols.map(({ key }) => key);
      const unused = (["a", "b", "c", "d", "e", "f"] as const).filter((key) => !used.includes(key));
      for (const profile of attractor.profiles) {
        expect(unused.map((key) => profile[key])).toEqual(unused.map(() => 0));
      }
    }
  });
});
