/**
 * Reads one number from a typed array. With `noUncheckedIndexedAccess`, an index access
 * can be `undefined`. The loops in this app never read outside the array, so 0 is only a guard.
 */
export function read(values: Float32Array, index: number): number {
  return values[index] ?? 0;
}
