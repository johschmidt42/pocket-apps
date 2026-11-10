import type { Attractor, MutableVec3, Vec3 } from "./attractors.ts";

/** The SVG viewBox of a preview. The attractors are about 2.3 units in radius. */
export const PREVIEW_VIEW_BOX = "-2.6 -2.6 5.2 5.2";

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / length, a[1] / length, a[2] / length];
}

/**
 * An SVG path of one long trajectory, seen from the camera of the attractor (without perspective).
 * It needs no random numbers, so the preview is always the same.
 */
export function previewPath(attractor: Attractor, steps = 12000): string {
  const { camera, center, scale, dt, seed, derivative } = attractor;
  const params = attractor.profiles[0];
  const forward = normalize(subtract(camera.target, camera.position));
  const right = normalize(cross(forward, camera.up));
  const up = cross(right, forward);

  const velocity: MutableVec3 = { x: 0, y: 0, z: 0 };
  let [x, y, z] = seed;
  const parts: string[] = [];
  const warmUp = 500;
  for (let s = 0; s < warmUp + steps; s++) {
    derivative(x, y, z, params, velocity);
    x += velocity.x * dt;
    y += velocity.y * dt;
    z += velocity.z * dt;
    // Every third point is enough for a smooth line and keeps the path short.
    if (s < warmUp || s % 3 !== 0) continue;
    const world: Vec3 = [(x - center[0]) * scale, (y - center[1]) * scale, (z - center[2]) * scale];
    const relative = subtract(world, camera.target);
    const px = dot(relative, right).toFixed(2);
    // SVG y goes down.
    const py = (-dot(relative, up)).toFixed(2);
    parts.push(`${parts.length === 0 ? "M" : "L"}${px} ${py}`);
  }
  return parts.join("");
}
