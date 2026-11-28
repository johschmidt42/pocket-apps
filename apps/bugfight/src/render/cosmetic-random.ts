/**
 * Random numbers from 0 to 1 for things that change only the picture.
 * The same seed gives the same numbers, so that a picture of the frames tool is always the same.
 * The sim never uses this generator.
 */
export function cosmeticRandom(seed: number): () => number {
  let a = seed >>> 0;
  // The generator "mulberry32".
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
