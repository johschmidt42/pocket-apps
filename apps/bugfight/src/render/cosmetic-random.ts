import { random } from "../sim/random.ts";

/**
 * Random numbers from 0 to 1 for things that change only the picture.
 * The same seed gives the same numbers, so that a test sees the same picture each time.
 * It is the generator of the sim with its own seed: the sim never uses these numbers.
 */
export function cosmeticRandom(seed: number): () => number {
  const state = { seed };
  return () => random(state);
}
