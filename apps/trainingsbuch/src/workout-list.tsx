import { isOneOf } from "@pocket-apps/core/one-of";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Progress } from "@pocket-apps/ui/components/progress";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { CircleCheck, CircleDashed, Search } from "lucide-react";
import type { Result, UnitSystem } from "./schema.ts";
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
  units: UnitSystem;
  search: string;
  onSearch: (search: string) => void;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  status: StatusFilter;
  onStatus: (status: StatusFilter) => void;
  onOpen: (workoutId: string) => void;
};

/** All workouts as cards in sections, with a search field, a category filter and a status filter. */
export function WorkoutList({
  workouts,
  results,
  units,
  search,
  onSearch,
  filter,
  onFilter,
  status,
  onStatus,
  onOpen,
}: WorkoutListProps) {
  const inCategory = workouts.filter((workout) => filter === "all" || workout.category === filter);
  const found = searchWorkouts(filterByStatus(inCategory, results, status), search);
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
        <div className="relative">
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
            placeholder="Workout oder Übung suchen, z. B. Fran oder Thruster"
            onChange={(event) => {
              onSearch(event.target.value);
            }}
          />
        </div>
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

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">{emptyMessage(search.trim(), status)}</p>
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
                  units={units}
                  onOpen={() => {
                    onOpen(workout.id);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Why the list is empty. Without a search and a status, only the own workouts can be empty. */
function emptyMessage(search: string, status: StatusFilter): string {
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
