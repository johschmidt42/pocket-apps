import type { MutableVec3, Vec3 } from "./attractors.ts";
import { read } from "./buffers.ts";

/**
 * How the mouse acts on the lines:
 * - "lens": it bends only the picture. The paths of the points stay the same.
 * - "gravity": it pulls on the points. Their paths change.
 * - "rubber": it pulls on the picture, and the lines spring back with a wobble.
 */
export type MouseMode = "lens" | "gravity" | "rubber";

/** The line from the camera through the mouse pointer. `direction` has the length 1. */
export type Ray = { origin: Vec3; direction: Vec3 };

/** The pointer over the picture: position from −1 to 1 (y up), and the state of the button. */
export type Pointer = { x: number; y: number; pressed: boolean };

/** The pointer at a screen position over a box. Null if the box has no size. */
export function pointerAt(
  box: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  pressed: boolean,
): Pointer | null {
  if (box.width <= 0 || box.height <= 0) return null;
  return {
    x: ((clientX - box.left) / box.width) * 2 - 1,
    y: 1 - ((clientY - box.top) / box.height) * 2,
    pressed,
  };
}

/** Strength of the pull: 0 without pointer, 1 with pointer, more while the button is down. */
export const PRESSED_STRENGTH = 2.5;

export function goalStrength(pointer: Pointer | null): number {
  if (pointer === null) return 0;
  return pointer.pressed ? PRESSED_STRENGTH : 1;
}

/** Moves the strength smoothly toward the goal. */
export function nextStrength(current: number, goal: number, seconds: number): number {
  return current + (goal - current) * (1 - Math.exp(-seconds * 6));
}

/**
 * Writes into `out` the vector from the ray to the point, at a right angle to the ray.
 * Returns the squared length of this vector.
 */
export function offsetFromRay(ray: Ray, x: number, y: number, z: number, out: MutableVec3): number {
  const [ox, oy, oz] = ray.origin;
  const [ux, uy, uz] = ray.direction;
  const wx = x - ox;
  const wy = y - oy;
  const wz = z - oz;
  const along = wx * ux + wy * uy + wz * uz;
  out.x = wx - along * ux;
  out.y = wy - along * uy;
  out.z = wz - along * uz;
  return out.x * out.x + out.y * out.y + out.z * out.z;
}

const GRAVITY = 1.2;
const GRAVITY_SOFTENING = 0.04;

/**
 * Mode "gravity": the extra velocity toward the ray, in world units per time unit.
 * It is strongest at a distance of 0.2 and gets weaker farther away.
 */
export function gravityVelocity(
  ray: Ray,
  strength: number,
  x: number,
  y: number,
  z: number,
  out: MutableVec3,
): void {
  const r2 = offsetFromRay(ray, x, y, z, out);
  const g = (GRAVITY * strength) / (r2 + GRAVITY_SOFTENING);
  out.x *= -g;
  out.y *= -g;
  out.z *= -g;
}

const LENS_RADIUS2 = 0.35 ** 2;

/** Mode "lens": `shown` gets the points of `points`, pulled toward the ray. */
export function applyLens(
  points: Float32Array,
  shown: Float32Array,
  ray: Ray,
  strength: number,
): void {
  const offset: MutableVec3 = { x: 0, y: 0, z: 0 };
  for (let i = 0; i + 2 < points.length; i += 3) {
    const x = read(points, i);
    const y = read(points, i + 1);
    const z = read(points, i + 2);
    const r2 = offsetFromRay(ray, x, y, z, offset);
    // Never more than 95 %, so that no point jumps over the ray.
    const f = Math.min(0.95, (0.6 * strength * LENS_RADIUS2) / (r2 + LENS_RADIUS2));
    shown[i] = x - f * offset.x;
    shown[i + 1] = y - f * offset.y;
    shown[i + 2] = z - f * offset.z;
  }
}

const SPRING = 30;
const DAMPING = 3;
const RUBBER_PULL = 2.2;
const RUBBER_SOFTENING = 0.25 ** 2;

/**
 * Mode "rubber": each point has an offset with a velocity. The ray pulls on the offset,
 * a spring pulls it back to 0. `shown` gets the point plus its offset.
 */
export function applyRubber(
  points: Float32Array,
  offsets: Float32Array,
  velocities: Float32Array,
  shown: Float32Array,
  ray: Ray,
  strength: number,
  seconds: number,
): void {
  const h = Math.min(seconds, 1 / 30);
  const pull = RUBBER_PULL * strength;
  const toRay: MutableVec3 = { x: 0, y: 0, z: 0 };
  for (let i = 0; i + 2 < points.length; i += 3) {
    const x = read(points, i);
    const y = read(points, i + 1);
    const z = read(points, i + 2);
    const ox = read(offsets, i);
    const oy = read(offsets, i + 1);
    const oz = read(offsets, i + 2);
    const r2 = offsetFromRay(ray, x + ox, y + oy, z + oz, toRay);
    const g = pull / (r2 + RUBBER_SOFTENING);
    // This is the semi-implicit Euler method. It changes the velocity first.
    // Then it moves the offset with the new velocity.
    const vx0 = read(velocities, i);
    const vy0 = read(velocities, i + 1);
    const vz0 = read(velocities, i + 2);
    const vx = vx0 + (-g * toRay.x - SPRING * ox - DAMPING * vx0) * h;
    const vy = vy0 + (-g * toRay.y - SPRING * oy - DAMPING * vy0) * h;
    const vz = vz0 + (-g * toRay.z - SPRING * oz - DAMPING * vz0) * h;
    velocities[i] = vx;
    velocities[i + 1] = vy;
    velocities[i + 2] = vz;
    offsets[i] = ox + vx * h;
    offsets[i + 1] = oy + vy * h;
    offsets[i + 2] = oz + vz * h;
    shown[i] = x + ox + vx * h;
    shown[i + 1] = y + oy + vy * h;
    shown[i + 2] = z + oz + vz * h;
  }
}
