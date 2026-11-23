import { ExerciseIcon } from "./exercise-icon.tsx";
import { EXERCISE_NAMES, type ExerciseId } from "./exercises.ts";
import { ExerciseAnimationCard } from "./figures/exercise-animation-card.tsx";
import { isWide } from "./figures/exercise.ts";
import { variantsOf } from "./figures/exercise-motions.ts";

/** The exercises of a workout. An exercise with an animation is a card, the others are chips. */
export function ExerciseSection({
  exercises,
  lines,
}: {
  exercises: readonly ExerciseId[];
  /** The text of the workout. It tells a strict pull-up from a kipping pull-up. */
  lines: readonly string[];
}) {
  const animated = exercises.flatMap((id) => {
    const variants = variantsOf(id, lines);
    return variants ? [{ id, variants }] : [];
  });
  const others = exercises.filter((id) => variantsOf(id, lines) === null);

  return (
    <div className="flex flex-col gap-3">
      {animated.length > 0 && (
        <ul
          aria-label="Animationen der Übungen"
          className="grid grid-flow-dense grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {animated.map(({ id, variants }) => (
            <li
              key={id}
              className={
                variants.some((variant) => isWide(variant.exercise)) ? "col-span-2" : undefined
              }
            >
              <ExerciseAnimationCard name={EXERCISE_NAMES[id]} variants={variants} />
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul aria-label="Übungen" className="flex flex-wrap gap-2">
          {others.map((exercise) => (
            <li
              key={exercise}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
            >
              <ExerciseIcon exercise={exercise} className="size-3.5 text-muted-foreground" />
              {EXERCISE_NAMES[exercise]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
