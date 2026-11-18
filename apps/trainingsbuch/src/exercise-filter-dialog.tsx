import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Ban, Check, Search } from "lucide-react";
import { useState } from "react";
import { CHIP_CLASSES, CHOICE_LABELS } from "./exercise-chip-styles.ts";
import {
  choiceOf,
  choose,
  exerciseOptions,
  hasExerciseFilter,
  NO_EXERCISE_FILTER,
  type ExerciseChoice,
  type ExerciseFilter,
} from "./exercise-filter.ts";
import type { ExerciseId } from "./exercises.ts";

export type ExerciseFilterDialogProps = {
  open: boolean;
  onClose: () => void;
  filter: ExerciseFilter;
  onFilter: (filter: ExerciseFilter) => void;
  /** How many workouts use each exercise. The picker shows only used exercises. */
  counts: ReadonlyMap<ExerciseId, number>;
  /** How many workouts match all filters of the list. */
  matchCount: number;
};

const MODES = ["with", "without"] as const;

/**
 * The picker of the exercise filter. A switch at the top sets the mode: "Include" (a workout
 * must have the exercise) or "Exclude" (a workout must not have it). Each exercise is a chip:
 * a tap chooses it in this mode, a second tap removes it. The list behind the dialog changes at
 * once.
 */
export function ExerciseFilterDialog({
  open,
  onClose,
  filter,
  onFilter,
  counts,
  matchCount,
}: ExerciseFilterDialogProps) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<ExerciseChoice>("with");
  // The last change, for screen readers: "Thruster: Include".
  const [lastChange, setLastChange] = useState("");
  const groups = exerciseOptions(counts, search, filter);

  function close() {
    // The next time, the search is empty and the mode is "Include" again.
    setSearch("");
    setMode("with");
    setLastChange("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col"
        // Focus the dialog, not the search field: on a phone, the keyboard would cover the list.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Übungen</DialogTitle>
          <DialogDescription>
            Include: Das Workout hat die Übung. Exclude: Das Workout hat sie nicht.
          </DialogDescription>
        </DialogHeader>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Modus"
          className="w-full"
          value={mode}
          onValueChange={(value) => {
            // A click on the chosen mode gives "": the mode stays.
            if (isOneOf(MODES, value)) setMode(value);
          }}
        >
          <ToggleGroupItem
            value="with"
            aria-label={`${CHOICE_LABELS.with}, ${String(filter.with.length)} gewählt`}
            className="flex-1 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Check aria-hidden="true" />
            {CHOICE_LABELS.with}
            <span className="tabular-nums opacity-60">{filter.with.length}</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="without"
            aria-label={`${CHOICE_LABELS.without}, ${String(filter.without.length)} gewählt`}
            className="flex-1 data-[state=on]:border-destructive/40 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive"
          >
            <Ban aria-hidden="true" />
            {CHOICE_LABELS.without}
            <span className="tabular-nums opacity-60">{filter.without.length}</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="relative">
          <Label htmlFor="exercise-search" className="sr-only">
            Übung suchen
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="exercise-search"
            type="search"
            className="pl-9"
            value={search}
            placeholder="Übung suchen, z. B. Thruster"
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
          {groups.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">
              Keine Übung passt zu „{search.trim()}“.
            </p>
          )}
          {groups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`exercise-group-${group.key}`}
              className="flex flex-col pb-4"
            >
              <h3
                id={`exercise-group-${group.key}`}
                className="pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
              >
                {group.title}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const choice = choiceOf(filter, option.id);
                  const workouts =
                    option.count === 1 ? "1 Workout" : `${String(option.count)} Workouts`;
                  return (
                    <li key={option.id}>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-pressed={choice === mode}
                        aria-label={`${option.name}, ${workouts}${choice === null ? "" : `: ${CHOICE_LABELS[choice]}`}`}
                        // A chip of the other mode is paler: it is chosen, but not in this mode.
                        className={`${CHIP_CLASSES[choice ?? "none"]} ${choice !== null && choice !== mode ? "opacity-50" : ""}`}
                        onClick={() => {
                          // A tap chooses the exercise in this mode, or removes it from this mode.
                          const next = choice === mode ? null : mode;
                          onFilter(choose(filter, option.id, next));
                          setLastChange(
                            `${option.name}: ${next === null ? "entfernt" : CHOICE_LABELS[next]}`,
                          );
                        }}
                      >
                        {choice === "with" && <Check data-icon="inline-start" />}
                        {choice === "without" && <Ban data-icon="inline-start" />}
                        <span className={choice === "without" ? "line-through" : undefined}>
                          {option.name}
                        </span>
                        <span className="text-xs tabular-nums opacity-60">{option.count}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <DialogFooter className="flex-row flex-wrap items-center gap-2">
          <p
            role="status"
            className="w-full text-sm text-muted-foreground tabular-nums sm:mr-auto sm:w-auto"
          >
            {lastChange !== "" && <span className="sr-only">{lastChange}. </span>}
            {matchCount === 1 ? "1 Workout passt" : `${String(matchCount)} Workouts passen`}
          </p>
          <Button
            variant="ghost"
            className="ml-auto sm:ml-0"
            disabled={!hasExerciseFilter(filter)}
            onClick={() => {
              onFilter(NO_EXERCISE_FILTER);
            }}
          >
            Zurücksetzen
          </Button>
          <Button onClick={close}>Anzeigen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
