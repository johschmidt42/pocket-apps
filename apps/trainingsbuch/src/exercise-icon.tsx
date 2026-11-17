import { Dumbbell } from "lucide-react";
import type { ExerciseId } from "./exercises.ts";

/**
 * The icon of an exercise. For now, all exercises show the same placeholder.
 * Later, each exercise gets its own SVG. Then only this component changes.
 */
export function ExerciseIcon({
  exercise,
  className,
}: {
  exercise: ExerciseId;
  className?: string;
}) {
  return <Dumbbell aria-hidden="true" data-exercise={exercise} className={className} />;
}
