import { ChevronRight } from "lucide-react";
import { formatDay } from "./dates.ts";
import type { Result } from "./schema.ts";
import { DivisionBadge } from "./division-badge.tsx";
import { formatKg, formatScore } from "./score.ts";
import type { Workout } from "./workouts.ts";

export type HistoryListProps = {
  /** All results, newest first. */
  results: readonly Result[];
  workouts: readonly Workout[];
  onOpen: (workoutId: string) => void;
};

/** All results of all workouts, newest first. */
export function HistoryList({ results, workouts, onOpen }: HistoryListProps) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine Ergebnisse. Wähle ein Workout und trage dein Ergebnis ein.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {results.map((result) => {
        const workout = workouts.find((item) => item.id === result.workoutId);
        const name = workout?.name ?? "Unbekanntes Workout";
        return (
          <li key={result.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default"
              disabled={!workout}
              onClick={() => {
                onOpen(result.workoutId);
              }}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDay(result.date)}
                  {result.loadKg !== null && ` · mit ${formatKg(result.loadKg)}`}
                </span>
                {result.notes !== "" && (
                  <span className="truncate text-sm text-muted-foreground">{result.notes}</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-semibold tabular-nums">{formatScore(result.score)}</span>
                <DivisionBadge division={result.division} />
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
