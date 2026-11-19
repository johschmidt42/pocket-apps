import { isOneOf } from "@pocket-apps/core/one-of";
import { Badge } from "@pocket-apps/ui/components/badge";
import { Button } from "@pocket-apps/ui/components/button";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Progress } from "@pocket-apps/ui/components/progress";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Ban, Check, CircleCheck, CircleDashed, Search, SlidersHorizontal, X } from "lucide-react";
import { useRef, useState } from "react";
import { CHIP_CLASSES, CHOICE_LABELS } from "./exercise-chip-styles.ts";
import { ExerciseFilterDialog } from "./exercise-filter-dialog.tsx";
import {
  choose,
  exerciseCounts,
  filterByExercises,
  hasExerciseFilter,
  NO_EXERCISE_FILTER,
  type ExerciseFilter,
} from "./exercise-filter.ts";
import { EXERCISE_NAMES } from "./exercises.ts";
import type { Result } from "./schema.ts";
import type { TextDisplay } from "./units.ts";
import { WorkoutCard } from "./workout-card.tsx";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  filterByStatus,
  FILTERS,
  groupWorkouts,
  searchWorkouts,
  STATUS_FILTERS,
  type Filter,
  type StatusFilter,
  type Workout,
} from "./workouts.ts";

export type WorkoutListProps = {
  workouts: readonly Workout[];
  results: readonly Result[];
  display: TextDisplay;
  search: string;
  onSearch: (search: string) => void;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  status: StatusFilter;
  onStatus: (status: StatusFilter) => void;
  exercises: ExerciseFilter;
  onExercises: (exercises: ExerciseFilter) => void;
  onOpen: (workoutId: string) => void;
};

/**
 * All workouts as cards in sections, with a search field, an exercise filter, a category filter
 * and a status filter.
 */
export function WorkoutList({
  workouts,
  results,
  display,
  search,
  onSearch,
  filter,
  onFilter,
  status,
  onStatus,
  exercises,
  onExercises,
  onOpen,
}: WorkoutListProps) {
  const [picking, setPicking] = useState(false);
  const exerciseButton = useRef<HTMLButtonElement>(null);
  const inCategory = workouts.filter((workout) => filter === "all" || workout.category === filter);
  // The other filters first: the picker counts the exercises of these workouts.
  const beforeExercises = searchWorkouts(filterByStatus(inCategory, results, status), search);
  const found = filterByExercises(beforeExercises, exercises);

  /** Changes the exercise filter after a click on a button that then goes away. */
  function changeExercises(next: ExerciseFilter) {
    onExercises(next);
    // The focus must not get lost: it goes to the button that opens the picker.
    exerciseButton.current?.focus();
  }
  const chosen = exercises.with.length + exercises.without.length;
  const groups = groupWorkouts(found);
  // The progress of a section counts all its workouts, also the ones that a filter hides.
  const done = new Set(results.map((result) => result.workoutId));
  const progress = new Map(
    groupWorkouts(workouts).map((group) => [
      group.key,
      {
        done: group.workouts.filter((workout) => done.has(workout.id)).length,
        total: group.workouts.length,
      },
    ]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Label htmlFor="workout-search" className="sr-only">
              Suchen
            </Label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="workout-search"
              type="search"
              className="pl-9"
              value={search}
              placeholder="Suchen, z. B. Fran oder Thruster"
              onChange={(event) => {
                onSearch(event.target.value);
              }}
            />
          </div>
          <Button
            ref={exerciseButton}
            variant="outline"
            aria-label={chosen > 0 ? `Übungen, ${String(chosen)} gewählt` : undefined}
            onClick={() => {
              setPicking(true);
            }}
          >
            <SlidersHorizontal data-icon="inline-start" />
            Übungen
            {chosen > 0 && (
              <Badge aria-hidden="true" className="ml-0.5 tabular-nums">
                {chosen}
              </Badge>
            )}
          </Button>
        </div>
        {hasExerciseFilter(exercises) && (
          <ExerciseChips exercises={exercises} onExercises={changeExercises} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={1}
            aria-label="Kategorie"
            className="flex-wrap justify-start"
            value={filter}
            onValueChange={(value) => {
              if (isOneOf(FILTERS, value)) onFilter(value);
            }}
          >
            {FILTERS.map((value) => (
              <ToggleGroupItem key={value} value={value} className="px-3">
                {value === "all" ? "Alle" : CATEGORY_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={1}
            aria-label="Status"
            className="flex-wrap justify-start"
            value={status}
            onValueChange={(value) => {
              if (isOneOf(STATUS_FILTERS, value)) onStatus(value);
            }}
          >
            <ToggleGroupItem value="all" className="px-3">
              Alle
            </ToggleGroupItem>
            <ToggleGroupItem value="done" className="px-3">
              <CircleCheck aria-hidden="true" />
              Gemacht
            </ToggleGroupItem>
            <ToggleGroupItem value="open" className="px-3">
              <CircleDashed aria-hidden="true" />
              Offen
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* No live region: it would speak at each key in the search. The picker has its own. */}
      <p className="-mb-2 text-sm text-muted-foreground tabular-nums">
        {found.length === workouts.length
          ? `${String(workouts.length)} Workouts`
          : `${String(found.length)} von ${String(workouts.length)} Workouts`}
      </p>

      {groups.length === 0 && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">
            {emptyMessage(search.trim(), status, {
              exercises: hasExerciseFilter(exercises),
              others: filter !== "all" || status !== "all",
            })}
          </p>
          {hasExerciseFilter(exercises) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                changeExercises(NO_EXERCISE_FILTER);
              }}
            >
              Übungsfilter zurücksetzen
            </Button>
          )}
        </div>
      )}

      {groups.map((group) => (
        <section
          key={group.key}
          aria-labelledby={`group-${group.key}`}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3
                id={`group-${group.key}`}
                className="text-sm font-bold tracking-widest text-muted-foreground uppercase"
              >
                {group.title}
              </h3>
              <SectionCount progress={progress.get(group.key)} />
            </div>
            {group.category !== "own" && (
              <Progress
                value={percent(progress.get(group.key))}
                aria-label={`${group.title}: gemachte Workouts`}
                className={`h-1.5 ${CATEGORY_COLORS[group.category].progress}`}
              />
            )}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.workouts.map((workout) => (
              <li key={workout.id}>
                <WorkoutCard
                  workout={workout}
                  results={results.filter((result) => result.workoutId === workout.id)}
                  display={display}
                  onOpen={() => {
                    onOpen(workout.id);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ExerciseFilterDialog
        open={picking}
        onClose={() => {
          setPicking(false);
        }}
        filter={exercises}
        onFilter={onExercises}
        counts={exerciseCounts(beforeExercises)}
        matchCount={found.length}
      />
    </div>
  );
}

/** The chosen exercises under the search field. A click removes one. */
function ExerciseChips({
  exercises,
  onExercises,
}: {
  exercises: ExerciseFilter;
  onExercises: (exercises: ExerciseFilter) => void;
}) {
  const chips = [
    ...exercises.with.map((id) => ({ id, choice: "with" as const })),
    ...exercises.without.map((id) => ({ id, choice: "without" as const })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label="Gewählte Übungen" className="flex flex-wrap gap-2">
        {chips.map(({ id, choice }) => (
          <li key={id}>
            <Button
              variant="outline"
              size="sm"
              aria-label={`${EXERCISE_NAMES[id]} (${CHOICE_LABELS[choice]}) entfernen`}
              className={CHIP_CLASSES[choice]}
              onClick={() => {
                onExercises(choose(exercises, id, null));
              }}
            >
              {choice === "with" ? (
                <Check data-icon="inline-start" />
              ) : (
                <Ban data-icon="inline-start" />
              )}
              <span className={choice === "with" ? undefined : "line-through"}>
                {EXERCISE_NAMES[id]}
              </span>
              <X data-icon="inline-end" />
            </Button>
          </li>
        ))}
      </ul>
      {chips.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onExercises(NO_EXERCISE_FILTER);
          }}
        >
          Alle entfernen
        </Button>
      )}
    </div>
  );
}

/**
 * Why the list is empty. Without a search, an exercise filter and a status, only the own
 * workouts can be empty.
 */
function emptyMessage(
  search: string,
  status: StatusFilter,
  active: { exercises: boolean; others: boolean },
): string {
  if (active.exercises) {
    // With the category or the status, the exercises are not the only cause.
    if (active.others) return "Kein Workout passt zu deinen Übungen und Filtern.";
    return search === ""
      ? "Kein Workout passt zu deinen Übungen."
      : `Kein Workout passt zu „${search}“ und deinen Übungen.`;
  }
  if (search !== "") return `Kein Workout passt zu „${search}“.`;
  switch (status) {
    case "done":
      return "Hier hast du noch kein Workout gemacht. Trage ein Ergebnis ein, dann steht das Workout hier.";
    case "open":
      return "Hier gibt es kein offenes Workout. Du hast alle gemacht.";
    case "all":
      return "Du hast noch kein eigenes Workout. Lege eins mit „Eigenes Workout“ an.";
  }
}

type SectionProgress = { done: number; total: number } | undefined;

function percent(progress: SectionProgress): number {
  return progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
}

/** "3 von 33 gemacht" next to the title of a section. */
function SectionCount({ progress }: { progress: SectionProgress }) {
  if (!progress) return null;
  return (
    <span className="text-sm text-muted-foreground tabular-nums">
      <span className="font-semibold text-foreground">{progress.done}</span> von {progress.total}{" "}
      gemacht
    </span>
  );
}
