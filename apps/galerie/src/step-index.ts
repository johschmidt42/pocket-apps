/** The keys that select another image. */
const STEPS: Partial<Record<string, "previous" | "next" | "first" | "last">> = {
  ArrowUp: "previous",
  ArrowLeft: "previous",
  ArrowDown: "next",
  ArrowRight: "next",
  Home: "first",
  End: "last",
};

/**
 * The index of the image that the key `key` selects, or `null` if the key does nothing.
 * `index` is the index of the selected image, `count` the number of images.
 */
export function stepIndex(key: string, index: number, count: number): number | null {
  const step = STEPS[key];
  if (step === undefined || count === 0) return null;
  switch (step) {
    case "previous":
      return Math.max(0, index - 1);
    case "next":
      return Math.min(count - 1, index + 1);
    case "first":
      return 0;
    case "last":
      return count - 1;
  }
}
