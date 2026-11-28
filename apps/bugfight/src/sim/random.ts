/**
 * The next random number of the game, from 0 to 1 (1 is not possible).
 * The generator keeps its place in `state.seed`. Thus the same seed and the same inputs
 * always give the same game. The generator is "mulberry32".
 */
export function random(state: { seed: number }): number {
  state.seed = (state.seed + 0x6d2b79f5) >>> 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
