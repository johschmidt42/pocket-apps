import type { Attractor, MutableVec3, Params } from "./attractors.ts";
import { read } from "./buffers.ts";
import { gravityVelocity, type Ray } from "./mouse-effects.ts";

/** Number of lines, as on zensical.org. */
export const LINE_COUNT = 225;

/** The time of one step of Aizawa. All attractors move at about this speed on screen. */
const STEP_TIME = 0.0125;

/** A line that goes farther than this from the center starts again. */
const ESCAPE_RADIUS2 = 4.5 ** 2;

/** The mouse pull of the mode "gravity". */
export type Pull = { ray: Ray; strength: number };

/** Start index (in points), number of points and relative speed of one line. */
export type Line = { start: number; length: number; speed: number };

export type Simulation = {
  lines: readonly Line[];
  /** All points of all lines, in world coordinates: x, y, z, x, y, z, … The head of a line comes first. */
  points: Float32Array;
  /** Offset and velocity per point for the mode "rubber". They move with their points. */
  offsets: Float32Array;
  velocities: Float32Array;
  /** Moves each line one step forward. */
  step: (params: Params, pull: Pull | null) => void;
  /** Starts all lines again. */
  reset: () => void;
};

export function createSimulation(
  attractor: Attractor,
  random: () => number,
  lineCount = LINE_COUNT,
): Simulation {
  // 192 to 384 points per line, in steps of 4, as on zensical.org.
  const lines: Line[] = [];
  let total = 0;
  for (let h = 0; h < lineCount; h++) {
    const length = (48 + Math.floor(random() * 49)) * 4;
    lines.push({ start: total, length, speed: 0.85 + random() * 0.3 });
    total += length;
  }

  const points = new Float32Array(3 * total);
  const offsets = new Float32Array(3 * total);
  const velocities = new Float32Array(3 * total);

  const { center, scale, dt, seed } = attractor;
  const velocity: MutableVec3 = { x: 0, y: 0, z: 0 };
  const pullVelocity: MutableVec3 = { x: 0, y: 0, z: 0 };

  /** Puts all points of the line on one random start point. */
  function seedLine({ start, length }: Line): void {
    const x = (seed[0] + random() - 0.5 - center[0]) * scale;
    const y = (seed[1] + random() - 0.5 - center[1]) * scale;
    const z = (seed[2] + random() - 0.5 - center[2]) * scale;
    for (let i = 3 * start; i < 3 * (start + length); i += 3) {
      points[i] = x;
      points[i + 1] = y;
      points[i + 2] = z;
    }
    offsets.fill(0, 3 * start, 3 * (start + length));
    velocities.fill(0, 3 * start, 3 * (start + length));
  }

  /**
   * One step of one line. With `shift`, the older points move one place back (the trail grows).
   * Without it, only the head moves. Returns false if the line escaped.
   */
  function stepLine(line: Line, params: Params, pull: Pull | null, shift: boolean): boolean {
    const i0 = 3 * line.start;
    const wx = read(points, i0);
    const wy = read(points, i0 + 1);
    const wz = read(points, i0 + 2);
    attractor.derivative(
      wx / scale + center[0],
      wy / scale + center[1],
      wz / scale + center[2],
      params,
      velocity,
    );
    const { speed } = line;
    let nx = wx + velocity.x * dt * speed * scale;
    let ny = wy + velocity.y * dt * speed * scale;
    let nz = wz + velocity.z * dt * speed * scale;
    if (pull !== null) {
      gravityVelocity(pull.ray, pull.strength, wx, wy, wz, pullVelocity);
      nx += pullVelocity.x * STEP_TIME * speed;
      ny += pullVelocity.y * STEP_TIME * speed;
      nz += pullVelocity.z * STEP_TIME * speed;
    }
    const r2 = nx * nx + ny * ny + nz * nz;
    if (!Number.isFinite(r2) || r2 > ESCAPE_RADIUS2) return false;
    if (shift) {
      const end = 3 * (line.start + line.length - 1);
      points.copyWithin(i0 + 3, i0, end);
      offsets.copyWithin(i0 + 3, i0, end);
      velocities.copyWithin(i0 + 3, i0, end);
    }
    points[i0] = nx;
    points[i0 + 1] = ny;
    points[i0 + 2] = nz;
    return true;
  }

  /** Brings the line onto the attractor and draws its full trail. */
  function warmUp(line: Line): void {
    const params = attractor.profiles[0];
    for (let attempt = 0; attempt < 5; attempt++) {
      seedLine(line);
      const before = 200 + Math.floor(random() * 2000);
      let ok = true;
      for (let s = 0; ok && s < before + line.length; s++) {
        ok = stepLine(line, params, null, s >= before);
      }
      if (ok) return;
    }
  }

  function reset(): void {
    lines.forEach(warmUp);
  }

  reset();

  return {
    lines,
    points,
    offsets,
    velocities,
    step(params, pull) {
      for (const line of lines) {
        if (!stepLine(line, params, pull, true)) seedLine(line);
      }
    },
    reset,
  };
}
