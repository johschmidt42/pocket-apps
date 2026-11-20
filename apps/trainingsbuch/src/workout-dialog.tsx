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
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { moveById, moveTo, useDragSort } from "@pocket-apps/ui/drag-sort";
import { SortHint } from "@pocket-apps/ui/sort-hint";
import { Dices } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { EXERCISE_IDS, exercisesByName } from "./exercises.ts";
import { Field } from "@pocket-apps/ui/field";
import { PartRow } from "./part-row.tsx";
import {
  amountInputId,
  draftFromPart,
  newPartDraft,
  partFromDraft,
  type PartDraft,
} from "./parts.ts";
import { SCORE_TYPES, type OwnWorkout, type Part, type ScoreType } from "./schema.ts";
import { parseCount, SCORE_TYPE_LABELS } from "./score.ts";
import { randomWorkoutName } from "./workout-names.ts";
import { newId } from "./workouts.ts";

/** What the dialog does. `resultCount`: the number of results of the workout. */
export type WorkoutDialogState =
  { kind: "closed" } | { kind: "new" } | { kind: "edit"; workout: OwnWorkout; resultCount: number };

export type WorkoutDialogProps = {
  state: WorkoutDialogState;
  /** The names of the other workouts. A random name is never one of them. */
  takenNames: readonly string[];
  onSave: (workout: OwnWorkout) => void;
  onClose: () => void;
};

/** The dialog to add or change an own workout. */
export function WorkoutDialog({ state, takenNames, onSave, onClose }: WorkoutDialogProps) {
  return (
    <Dialog
      open={state.kind !== "closed"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        {state.kind === "new" && (
          <WorkoutForm
            key="new"
            workout={null}
            lockScoreType={false}
            takenNames={takenNames}
            onSave={onSave}
          />
        )}
        {state.kind === "edit" && (
          <WorkoutForm
            key={state.workout.id}
            workout={state.workout}
            lockScoreType={state.resultCount > 0}
            takenNames={takenNames}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The label of the minutes field. `null`: the score type has no minutes. */
function minutesLabel(scoreType: ScoreType): string | null {
  switch (scoreType) {
    case "time-or-reps":
      return "Time Cap in Minuten";
    case "rounds-reps":
    case "reps":
      return "Dauer in Minuten (optional)";
    case "time":
    case "load":
      return null;
  }
}

function WorkoutForm({
  workout,
  lockScoreType,
  takenNames,
  onSave,
}: {
  workout: OwnWorkout | null;
  /** True if the workout has results. Their scores need the same score type. */
  lockScoreType: boolean;
  takenNames: readonly string[];
  onSave: (workout: OwnWorkout) => void;
}) {
  const [name, setName] = useState(workout?.name ?? "");
  const [scoreType, setScoreType] = useState<ScoreType>(workout?.scoreType ?? "time");
  const [minutes, setMinutes] = useState(workout?.timeCapMinutes?.toString() ?? "");
  const [rounds, setRounds] = useState(workout?.rounds?.toString() ?? "");
  const [drafts, setDrafts] = useState<PartDraft[]>(workout?.parts.map(draftFromPart) ?? []);
  const [notes, setNotes] = useState(workout?.notes ?? "");
  const [showErrors, setShowErrors] = useState(false);
  const sort = useDragSort({
    onDrop: (draggedId, targetId, position) => {
      setDrafts((current) => moveTo(current, draggedId, targetId, position));
    },
    onStep: (id, direction) => {
      setDrafts((current) => moveById(current, id, direction));
    },
  });

  const minutesField = minutesLabel(scoreType);
  const minuteCount = minutes.trim() === "" ? null : parseCount(minutes);
  const minutesError =
    minutesField === null
      ? null
      : scoreType === "time-or-reps" && minutes.trim() === ""
        ? "Bitte den Time Cap in ganzen Minuten eingeben, z. B. 12."
        : minutes.trim() !== "" && (minuteCount === null || minuteCount === 0)
          ? "Bitte die Minuten als ganze Zahl eingeben, z. B. 12."
          : null;
  const roundCount = rounds.trim() === "" ? null : parseCount(rounds);
  const roundsError =
    rounds.trim() !== "" && (roundCount === null || roundCount === 0)
      ? "Bitte die Runden als ganze Zahl eingeben, z. B. 5."
      : null;
  const checks = drafts.map(partFromDraft);
  const partErrors = checks.flatMap((check) => (check.kind === "error" ? [check.message] : []));

  function changeDraft(next: PartDraft) {
    setDrafts((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  function addExercise(value: string) {
    if (!isOneOf(EXERCISE_IDS, value)) return;
    const draft = newPartDraft(value, newId());
    // Render the new row now. Then the focus can move to its first input.
    flushSync(() => {
      setDrafts((current) => [...current, draft]);
    });
    document.getElementById(amountInputId(draft.id))?.focus();
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (minutesError ?? roundsError ?? partErrors[0]) {
          setShowErrors(true);
          return;
        }
        const parts: Part[] = checks.flatMap((check) => (check.kind === "ok" ? [check.part] : []));
        onSave({
          id: workout?.id ?? newId(),
          // Without a name, the workout gets a random name.
          name: name.trim() === "" ? randomWorkoutName(takenNames) : name.trim(),
          scoreType,
          timeCapMinutes: minutesField === null ? null : minuteCount,
          rounds: roundCount,
          parts,
          notes: notes.trim(),
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{workout ? "Workout bearbeiten" : "Eigenes Workout"}</DialogTitle>
        <DialogDescription>
          Zum Beispiel ein Workout aus deiner Box, das du wiederholen willst.
        </DialogDescription>
      </DialogHeader>

      <Field id="workout-name" label="Name (optional)">
        <div className="flex gap-2">
          <Input
            id="workout-name"
            value={name}
            placeholder="Leer: Die App wählt einen Namen."
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Zufälligen Namen vorschlagen"
            onClick={() => {
              setName(randomWorkoutName(takenNames));
            }}
          >
            <Dices />
          </Button>
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="workout-score-type" label="Wertung nach">
          <NativeSelect
            id="workout-score-type"
            className="w-full"
            value={scoreType}
            disabled={lockScoreType}
            aria-describedby={lockScoreType ? "workout-score-type-hint" : undefined}
            onChange={(event) => {
              if (isOneOf(SCORE_TYPES, event.target.value)) setScoreType(event.target.value);
            }}
          >
            {SCORE_TYPES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {SCORE_TYPE_LABELS[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {lockScoreType && (
            <p id="workout-score-type-hint" className="text-xs text-muted-foreground">
              Das Workout hat schon Ergebnisse. Darum bleibt die Wertung gleich.
            </p>
          )}
        </Field>
        {minutesField !== null && (
          <Field id="workout-minutes" label={minutesField} error={showErrors ? minutesError : null}>
            <Input
              id="workout-minutes"
              inputMode="numeric"
              value={minutes}
              placeholder="z. B. 12"
              aria-invalid={showErrors && minutesError !== null}
              onChange={(event) => {
                setMinutes(event.target.value);
              }}
            />
          </Field>
        )}
        <Field
          id="workout-rounds"
          label="Runden (optional)"
          error={showErrors ? roundsError : null}
        >
          <Input
            id="workout-rounds"
            inputMode="numeric"
            value={rounds}
            placeholder="z. B. 5"
            aria-invalid={showErrors && roundsError !== null}
            onChange={(event) => {
              setRounds(event.target.value);
            }}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Übungen</legend>
        <SortHint />
        {drafts.length > 0 && (
          <ul className="relative flex flex-col gap-2" {...sort.listProps()}>
            {drafts.map((draft, index) => (
              <li key={draft.id} {...sort.rowProps(draft.id)} className={sort.rowClass(draft.id)}>
                <PartRow
                  draft={draft}
                  handleProps={sort.handleProps(draft.id)}
                  invalid={showErrors && checks[index]?.kind === "error"}
                  onChange={changeDraft}
                  onRemove={() => {
                    setDrafts((current) => current.filter((item) => item.id !== draft.id));
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        {showErrors &&
          partErrors.map((message) => (
            <p key={message} className="text-sm text-destructive">
              {message}
            </p>
          ))}
        <Label htmlFor="workout-add-exercise" className="sr-only">
          Übung hinzufügen
        </Label>
        <NativeSelect
          id="workout-add-exercise"
          className="w-full"
          value=""
          onChange={(event) => {
            addExercise(event.target.value);
          }}
        >
          <NativeSelectOption value="">+ Übung hinzufügen …</NativeSelectOption>
          {exercisesByName().map((exercise) => (
            <NativeSelectOption key={exercise.id} value={exercise.id}>
              {exercise.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </fieldset>

      <Field id="workout-notes" label="Notizen (optional)">
        <Textarea
          id="workout-notes"
          value={notes}
          placeholder="z. B. 2 Minuten Pause zwischen den Runden"
          onChange={(event) => {
            setNotes(event.target.value);
          }}
        />
      </Field>

      <DialogFooter>
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}
