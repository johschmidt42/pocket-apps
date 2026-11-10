/** True if `value` is one of `values`. Narrows a string to a union of string literals. */
export function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((candidate) => candidate === value);
}
