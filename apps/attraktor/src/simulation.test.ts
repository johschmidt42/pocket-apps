import { describe, expect, it } from "vitest";
import { ATTRACTORS, type Attractor } from "./attractors.ts";
import type { Ray } from "./mouse-effects.ts";
import { seededRandom } from "./seeded-random.ts";
import { createSimulation } from "./simulation.ts";

const [AIZAWA] = ATTRACTORS;
const PARAMS = AIZAWA!.profiles[0];

/** An attractor that always flies away. */
const RUNAWAY: Attractor = {
  ...AIZAWA!,
  derivative: (_x, _y, _z, _p, out) => {
    out.x = 1000;
    out.y = 0;
    out.z = 0;
  },
};

function point(points: Float32Array, index: number): number[] {
  return Array.from(points.slice(3 * index, 3 * index + 3));
}

describe("createSimulation", () => {
  it("makes lines of 192 to 384 points, one after the other", () => {
    const simulation = createSimulation(AIZAWA!, seededRandom(1), 20);
    expect(simulation.lines).toHaveLength(20);
    let next = 0;
    for (const { start, length, speed } of simulation.lines) {
      expect(start).toBe(next);
      expect(length % 4).toBe(0);
      expect(length).toBeGreaterThanOrEqual(192);
      expect(length).toBeLessThanOrEqual(384);
      expect(speed).toBeGreaterThanOrEqual(0.85);
      expect(speed).toBeLessThan(1.15);
      next += length;
    }
    expect(simulation.points).toHaveLength(3 * next);
  });

  it("starts with full trails inside the picture", () => {
    const simulation = createSimulation(AIZAWA!, seededRandom(2), 10);
    for (let i = 0; i < simulation.points.length; i += 3) {
      const radius = Math.hypot(...point(simulation.points, i / 3));
      expect(radius).toBeLessThan(4.5);
    }
    // A full trail: the last point is not the start point of the head.
    const [line] = simulation.lines;
    expect(point(simulation.points, line!.start)).not.toEqual(
      point(simulation.points, line!.start + line!.length - 1),
    );
  });

  it("moves the head forward and the trail one place back", () => {
    const simulation = createSimulation(AIZAWA!, seededRandom(3), 2);
    const [line] = simulation.lines;
    const head = point(simulation.points, line!.start);
    simulation.offsets[3 * line!.start] = 0.5;

    simulation.step(PARAMS, null);

    expect(point(simulation.points, line!.start)).not.toEqual(head);
    expect(point(simulation.points, line!.start + 1)).toEqual(head);
    // The rubber offset moves with its point.
    expect(simulation.offsets[3 * (line!.start + 1)]).toBe(0.5);
  });

  it("bends the path toward the mouse ray with a pull", () => {
    const free = createSimulation(AIZAWA!, seededRandom(4), 1);
    const pulled = createSimulation(AIZAWA!, seededRandom(4), 1);
    const head = point(free.points, 0);
    // A ray along z, 0.3 units beside the head.
    const ray: Ray = { origin: [(head[0] ?? 0) + 0.3, head[1] ?? 0, -5], direction: [0, 0, 1] };

    free.step(PARAMS, null);
    pulled.step(PARAMS, { ray, strength: 1 });

    expect(point(pulled.points, 0)[0]).toBeGreaterThan(point(free.points, 0)[0] ?? 0);
  });

  it("starts a line again when it flies away", () => {
    const simulation = createSimulation(RUNAWAY, seededRandom(5), 1);
    simulation.step(PARAMS, null);
    // All points of the line are on one new start point.
    const first = point(simulation.points, 0);
    for (let i = 1; i < simulation.lines[0]!.length; i++) {
      expect(point(simulation.points, i)).toEqual(first);
    }
  });

  it("starts all lines again on reset and clears the rubber", () => {
    const simulation = createSimulation(AIZAWA!, seededRandom(6), 3);
    const before = Array.from(simulation.points);
    simulation.offsets.fill(1);
    simulation.velocities.fill(1);

    simulation.reset();

    expect(Array.from(simulation.points)).not.toEqual(before);
    expect(simulation.offsets.every((value) => value === 0)).toBe(true);
    expect(simulation.velocities.every((value) => value === 0)).toBe(true);
  });
});
