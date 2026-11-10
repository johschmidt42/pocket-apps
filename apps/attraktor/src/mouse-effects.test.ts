import { describe, expect, it } from "vitest";
import type { MutableVec3 } from "./attractors.ts";
import {
  applyLens,
  applyRubber,
  goalStrength,
  gravityVelocity,
  nextStrength,
  offsetFromRay,
  pointerAt,
  PRESSED_STRENGTH,
  type Ray,
} from "./mouse-effects.ts";

/** A ray along z through (0, 0). */
const Z_RAY: Ray = { origin: [0, 0, -5], direction: [0, 0, 1] };

describe("pointerAt", () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };

  it("gives −1 to 1 with y up", () => {
    expect(pointerAt(box, 200, 100, false)).toEqual({ x: 0, y: 0, pressed: false });
    expect(pointerAt(box, 100, 50, true)).toEqual({ x: -1, y: 1, pressed: true });
    expect(pointerAt(box, 300, 150, false)).toEqual({ x: 1, y: -1, pressed: false });
  });

  it("gives null for a box without size", () => {
    expect(pointerAt({ left: 0, top: 0, width: 0, height: 10 }, 0, 0, false)).toBeNull();
    expect(pointerAt({ left: 0, top: 0, width: 10, height: 0 }, 0, 0, false)).toBeNull();
  });
});

describe("strength", () => {
  it("is 0 without pointer, 1 with pointer and more with the button down", () => {
    expect(goalStrength(null)).toBe(0);
    expect(goalStrength({ x: 0, y: 0, pressed: false })).toBe(1);
    expect(goalStrength({ x: 0, y: 0, pressed: true })).toBe(PRESSED_STRENGTH);
  });

  it("moves smoothly toward the goal", () => {
    const next = nextStrength(0, 1, 0.1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
    expect(nextStrength(0, 1, 10)).toBeCloseTo(1);
    expect(nextStrength(0.5, 0.5, 1)).toBe(0.5);
  });
});

describe("offsetFromRay", () => {
  it("gives the vector from the ray to the point at a right angle", () => {
    const out: MutableVec3 = { x: 0, y: 0, z: 0 };
    expect(offsetFromRay(Z_RAY, 1, 2, 7, out)).toBeCloseTo(5);
    expect(out).toEqual({ x: 1, y: 2, z: 0 });
  });
});

describe("gravityVelocity", () => {
  it("points toward the ray", () => {
    const out: MutableVec3 = { x: 0, y: 0, z: 0 };
    gravityVelocity(Z_RAY, 1, 0.5, 0, 3, out);
    expect(out.x).toBeLessThan(0);
    expect(out.y).toBeCloseTo(0);
    expect(out.z).toBeCloseTo(0);
  });

  it("is stronger near the ray than far away", () => {
    const near: MutableVec3 = { x: 0, y: 0, z: 0 };
    const far: MutableVec3 = { x: 0, y: 0, z: 0 };
    gravityVelocity(Z_RAY, 1, 0.2, 0, 0, near);
    gravityVelocity(Z_RAY, 1, 2, 0, 0, far);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });

  it("is 0 with strength 0", () => {
    const out: MutableVec3 = { x: 1, y: 1, z: 1 };
    gravityVelocity(Z_RAY, 0, 0.5, 0.5, 0, out);
    expect(Math.abs(out.x) + Math.abs(out.y) + Math.abs(out.z)).toBe(0);
  });
});

describe("applyLens", () => {
  it("pulls points toward the ray, but not over it", () => {
    const points = new Float32Array([0.2, 0, 1, 0, 0, 2]);
    const shown = new Float32Array(6);
    applyLens(points, shown, Z_RAY, 2.5);
    expect(shown[0]).toBeGreaterThan(0);
    expect(shown[0]).toBeLessThan(0.2);
    expect(shown[2]).toBeCloseTo(1);
    // A point on the ray stays.
    expect(Array.from(shown.slice(3))).toEqual([0, 0, 2]);
  });

  it("changes nothing with strength 0", () => {
    const points = new Float32Array([0.2, 0.3, 1]);
    const shown = new Float32Array(3);
    applyLens(points, shown, Z_RAY, 0);
    expect(Array.from(shown)).toEqual(Array.from(points));
  });
});

describe("applyRubber", () => {
  it("pulls the points toward the ray, then springs back", () => {
    const points = new Float32Array([0.3, 0, 0]);
    const offsets = new Float32Array(3);
    const velocities = new Float32Array(3);
    const shown = new Float32Array(3);

    for (let i = 0; i < 30; i++) {
      applyRubber(points, offsets, velocities, shown, Z_RAY, 1, 1 / 60);
    }
    expect(offsets[0]).toBeLessThan(0);
    expect(shown[0]).toBeCloseTo((points[0] ?? 0) + (offsets[0] ?? 0));

    for (let i = 0; i < 600; i++) {
      applyRubber(points, offsets, velocities, shown, Z_RAY, 0, 1 / 60);
    }
    expect(offsets[0]).toBeCloseTo(0, 3);
    expect(shown[0]).toBeCloseTo(0.3, 3);
  });

  it("uses at most 1/30 second per call, so that a slow frame does not explode", () => {
    const points = new Float32Array([0.3, 0, 0]);
    const offsets = new Float32Array(3);
    const velocities = new Float32Array(3);
    const shown = new Float32Array(3);
    applyRubber(points, offsets, velocities, shown, Z_RAY, 2.5, 5);
    expect(Math.abs(offsets[0] ?? 0)).toBeLessThan(0.3);
  });
});
