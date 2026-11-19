import { CircleCheck, CircleDashed, Hash, Repeat, Timer, Trophy, Weight } from "lucide-react";
import { useId } from "react";
import { ExerciseIcon } from "./exercise-icon.tsx";
import { EXERCISE_NAMES } from "./exercises.ts";
import { planBlocks } from "./plan.ts";
import type { Result, ScoreType } from "./schema.ts";
import { bestResult, DIVISION_LABELS, formatScore } from "./score.ts";
import { showLine, type TextDisplay } from "./units.ts";
import { CATEGORY_COLORS, formatLabel, type Workout } from "./workouts.ts";

/** A symbol for each score type: a stop watch for "For Time", arrows for "AMRAP" and so on. */
const FORMAT_ICONS: Record<ScoreType, typeof Timer> = {
  time: Timer,
  "time-or-reps": Timer,
  "rounds-reps": Repeat,
  reps: Hash,
  load: Weight,
};

export type WorkoutCardProps = {
  workout: Workout;
  /** The results of this workout. */
  results: readonly Result[];
  /** How the texts show loads and distances. */
  display: TextDisplay;
  onOpen: () => void;
};

/** Headings that only repeat the format label of the card ("For Time", "AMRAP 20 min"). */
const SAME_AS_LABEL = /^(for time( of)?|as many rounds( and reps)? as possible\b.*)$/i;

/**
 * The first heading of the prescription, for example "21-15-9 reps for time of". `null` if
 * there is none, or if it only repeats the format label.
 */
function formatLine(workout: Workout): string | null {
  for (const block of planBlocks(workout.lines)) {
    if (block.kind !== "heading") continue;
    if (block.scheme !== null) return `${block.scheme} ${block.text}`;
    return SAME_AS_LABEL.test(block.text) ? null : block.text;
  }
  return null;
}

/**
 * A workout in the list: name, format and all exercises as chips. A symbol shows if the
 * user did the workout. Then the card also shows the best result.
 */
export function WorkoutCard({ workout, results, display, onOpen }: WorkoutCardProps) {
  const best = bestResult(results);
  // The IDs connect the name, the status and the lines with the button. They must be unique.
  const id = useId();
  const format = formatLine(workout);
  const names = workout.exercises.map((exercise) => EXERCISE_NAMES[exercise]);
  const colors = CATEGORY_COLORS[workout.category];
  const FormatIcon = FORMAT_ICONS[workout.scoreType];

  return (
    <button
      type="button"
      aria-labelledby={`${id}-name ${id}-status`}
      aria-describedby={`${id}-plan`}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border text-left transition hover:border-foreground/20 hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:hover:-translate-y-0.5 ${best ? colors.tint : "bg-card"}`}
      onClick={onOpen}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-full shrink-0 transition-[height] group-hover:h-2.5 ${colors.bg}`}
      />
      <span className="flex flex-1 flex-col gap-2 p-4">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <FormatIcon aria-hidden="true" className="size-3.5" />
          {formatLabel(workout)}
        </span>
        <span className="flex items-start justify-between gap-2">
          <span
            id={`${id}-name`}
            className="text-2xl leading-none font-black tracking-tight uppercase"
          >
            {workout.name}
          </span>
          {best ? (
            <CircleCheck aria-hidden="true" className={`size-6 shrink-0 ${colors.text}`} />
          ) : (
            <CircleDashed aria-hidden="true" className="size-6 shrink-0 text-muted-foreground/50" />
          )}
          <span id={`${id}-status`} className="sr-only">
            {best ? "Gemacht" : "Noch nicht gemacht"}
          </span>
        </span>
        <span id={`${id}-plan`} className="flex flex-col gap-2">
          {format !== null && (
            <span className="text-sm text-muted-foreground">{showLine(format, display)}</span>
          )}
          {names.length > 0 && (
            <>
              <span className="sr-only">Übungen: {names.join(", ")}</span>
              <span aria-hidden="true" className="flex flex-wrap gap-1.5">
                {workout.exercises.map((exercise) => (
                  <span
                    key={exercise}
                    className="flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-0.5 text-xs font-medium ring-1 ring-foreground/5"
                  >
                    <ExerciseIcon exercise={exercise} className="size-3 text-muted-foreground" />
                    {EXERCISE_NAMES[exercise]}
                  </span>
                ))}
              </span>
            </>
          )}
        </span>
        {best && (
          <span className="mt-auto flex items-center justify-between gap-2 border-t border-foreground/10 pt-3 text-sm">
            <span className="flex items-center gap-1.5">
              <Trophy aria-hidden="true" className={`size-4 ${colors.text}`} />
              <span className="font-bold tabular-nums">{formatScore(best.score)}</span>
              {best.division !== null && (
                <span className="text-muted-foreground">{DIVISION_LABELS[best.division]}</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {results.length === 1 ? "1 Ergebnis" : `${String(results.length)} Ergebnisse`}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
