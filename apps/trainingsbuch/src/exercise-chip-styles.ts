import type { ExerciseChoice } from "./exercise-filter.ts";

/**
 * The look of an exercise chip for each choice, in the picker and in the list. Use it on a
 * `Button` with `variant="outline"`. Full class names, so that Tailwind finds them.
 */
export const CHIP_CLASSES: Record<ExerciseChoice | "none", string> = {
  none: "",
  with: "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:border-primary dark:bg-primary dark:hover:bg-primary/90",
  without:
    "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive dark:border-destructive/40 dark:bg-destructive/15 dark:hover:bg-destructive/20",
};

/**
 * The name of a choice. The project owner wants the English words, like the exercise names.
 * See "Exercise filter with Include and Exclude" in docs/decisions.md.
 */
export const CHOICE_LABELS: Record<ExerciseChoice, string> = {
  with: "Include",
  without: "Exclude",
};
