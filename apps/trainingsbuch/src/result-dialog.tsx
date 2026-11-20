import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import { Checkbox } from "@pocket-apps/ui/components/checkbox";
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
import { useState } from "react";
import { decimalInput } from "./decimal.ts";
import { Field } from "@pocket-apps/ui/field";
import { isoDay } from "./dates.ts";
import { DIVISIONS, type Division, type Result } from "./schema.ts";
import { inputFromScore, parseKg, scoreFromInput, type ScoreInput } from "./score.ts";
import { newId, type Workout } from "./workouts.ts";

/** What the dialog edits. `result` is `null` for a new result. */
export type ResultDraft = { workout: Workout; result: Result | null };

export type ResultDialogProps = {
  /** `null` closes the dialog. */
  draft: ResultDraft | null;
  onSave: (result: Result) => void;
  onClose: () => void;
};

/** The dialog to add or change the result of a workout. */
export function ResultDialog({ draft, onSave, onClose }: ResultDialogProps) {
  return (
    <Dialog
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {draft && <ResultForm key={draft.result?.id ?? "new"} draft={draft} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function ResultForm({ draft, onSave }: { draft: ResultDraft; onSave: (result: Result) => void }) {
  const { workout, result } = draft;
  const [date, setDate] = useState(result?.date ?? isoDay(new Date()));
  // A new result of a built-in workout starts with Rx. Own workouts often have no
  // prescription, so their new results start without a mark.
  const [division, setDivision] = useState<Division | null>(
    result ? result.division : workout.category === "own" ? null : "rx",
  );
  const [input, setInput] = useState<ScoreInput>(inputFromScore(result?.score ?? null));
  const [load, setLoad] = useState(
    result && result.loadKg !== null ? decimalInput(result.loadKg) : "",
  );
  const [notes, setNotes] = useState(result?.notes ?? "");
  const [showErrors, setShowErrors] = useState(false);

  const check = scoreFromInput(workout.scoreType, input);
  const loadKg = load.trim() === "" ? null : parseKg(load);
  const dateError = /^\d{4}-\d{2}-\d{2}$/.test(date) ? null : "Bitte ein Datum eingeben.";
  const scoreError = check.kind === "error" ? check.message : null;
  const loadError =
    load.trim() !== "" && loadKg === null ? "Bitte ein Gewicht in kg eingeben, z. B. 42,5." : null;
  const withTime =
    workout.scoreType === "time" || (workout.scoreType === "time-or-reps" && !input.capped);
  const withReps =
    workout.scoreType === "reps" || (workout.scoreType === "time-or-reps" && input.capped);

  function change(patch: Partial<ScoreInput>) {
    setInput((current) => ({ ...current, ...patch }));
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (check.kind === "error" || dateError !== null || loadError !== null) {
          setShowErrors(true);
          return;
        }
        onSave({
          id: result?.id ?? newId(),
          workoutId: workout.id,
          date,
          division,
          score: check.score,
          loadKg: workout.scoreType === "load" ? null : loadKg,
          notes: notes.trim(),
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{result ? "Ergebnis bearbeiten" : "Ergebnis eintragen"}</DialogTitle>
        <DialogDescription>{workout.name}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="result-date" label="Datum" error={showErrors ? dateError : null}>
          <Input
            id="result-date"
            type="date"
            max="9999-12-31"
            value={date}
            aria-invalid={showErrors && dateError !== null}
            onChange={(event) => {
              setDate(event.target.value);
            }}
          />
        </Field>
        <Field id="result-division" label="Rx / Scaled">
          <NativeSelect
            id="result-division"
            className="w-full"
            value={division ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setDivision(isOneOf(DIVISIONS, value) ? value : null);
            }}
          >
            <NativeSelectOption value="rx">Rx (wie vorgeschrieben)</NativeSelectOption>
            <NativeSelectOption value="scaled">Scaled (angepasst)</NativeSelectOption>
            <NativeSelectOption value="">Keine Angabe</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>

      {workout.scoreType === "time-or-reps" && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="result-capped"
            checked={input.capped}
            onCheckedChange={(checked) => {
              change({ capped: checked === true });
            }}
          />
          <Label htmlFor="result-capped" className="cursor-pointer">
            {workout.timeCapMinutes === null
              ? "Time Cap erreicht (nicht fertig)"
              : `Time Cap von ${String(workout.timeCapMinutes)} Minuten erreicht (nicht fertig)`}
          </Label>
        </div>
      )}

      {withTime && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Zeit</legend>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="result-minutes"
              label="Minuten"
              value={input.minutes}
              invalid={showErrors && scoreError !== null}
              onChange={(minutes) => {
                change({ minutes });
              }}
            />
            <NumberField
              id="result-seconds"
              label="Sekunden"
              value={input.seconds}
              invalid={showErrors && scoreError !== null}
              onChange={(seconds) => {
                change({ seconds });
              }}
            />
          </div>
        </fieldset>
      )}

      {workout.scoreType === "rounds-reps" && (
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            id="result-rounds"
            label="Runden"
            value={input.rounds}
            invalid={showErrors && scoreError !== null}
            onChange={(rounds) => {
              change({ rounds });
            }}
          />
          <NumberField
            id="result-reps"
            label="Extra-Wiederholungen"
            value={input.reps}
            invalid={showErrors && scoreError !== null}
            onChange={(reps) => {
              change({ reps });
            }}
          />
        </div>
      )}

      {withReps && (
        <NumberField
          id="result-reps"
          label="Wiederholungen"
          value={input.reps}
          invalid={showErrors && scoreError !== null}
          onChange={(reps) => {
            change({ reps });
          }}
        />
      )}

      {workout.scoreType === "load" && (
        <Field id="result-kg" label="Gewicht in kg">
          <Input
            id="result-kg"
            inputMode="decimal"
            value={input.kg}
            placeholder="z. B. 102,5"
            aria-invalid={showErrors && scoreError !== null}
            onChange={(event) => {
              change({ kg: event.target.value });
            }}
          />
        </Field>
      )}

      {showErrors && scoreError && (
        <p className="text-sm text-destructive" role="alert">
          {scoreError}
        </p>
      )}

      {workout.scoreType !== "load" && (
        <Field
          id="result-load"
          label="Gewicht in kg (optional)"
          error={showErrors ? loadError : null}
        >
          <Input
            id="result-load"
            inputMode="decimal"
            value={load}
            placeholder="z. B. 42,5"
            aria-invalid={showErrors && loadError !== null}
            onChange={(event) => {
              setLoad(event.target.value);
            }}
          />
        </Field>
      )}

      <Field id="result-notes" label="Notizen (optional)">
        <Textarea
          id="result-notes"
          value={notes}
          placeholder="z. B. Pull-ups mit Band"
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

function NumberField({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        aria-invalid={invalid}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </Field>
  );
}
