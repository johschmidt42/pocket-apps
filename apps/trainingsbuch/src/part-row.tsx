import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { DragHandle } from "@pocket-apps/ui/drag-handle";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { ExerciseIcon } from "./exercise-icon.tsx";
import {
  BOX_HEIGHTS,
  EXERCISE_NAMES,
  hasBox,
  isWeighted,
  unitsOf,
  UNIT_LABELS,
} from "./exercises.ts";
import { amountInputId, type PartDraft } from "./parts.ts";

export type PartRowProps = {
  draft: PartDraft;
  /** The props of the grip from `useDragSort().handleProps(id)`. */
  handleProps: Omit<ComponentProps<typeof DragHandle>, "name">;
  invalid: boolean;
  onChange: (draft: PartDraft) => void;
  onRemove: () => void;
};

/** The usual box heights, plus another height of the part (for example 36 from the AI). */
function boxChoices(current: string): number[] {
  const inches = Number(current);
  const usual: readonly number[] = BOX_HEIGHTS;
  return current === "" || usual.includes(inches)
    ? [...usual]
    : [...usual, inches].sort((a, b) => a - b);
}

/** One exercise of an own workout: amount, unit, weight and box height. */
export function PartRow({ draft, handleProps, invalid, onChange, onRemove }: PartRowProps) {
  const name = EXERCISE_NAMES[draft.exercise];
  const units = unitsOf(draft.exercise);
  const prefix = `part-${draft.id}`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-2">
      <div className="flex items-center gap-2">
        <DragHandle name={name} small {...handleProps} />
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <ExerciseIcon exercise={draft.exercise} className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`${name} entfernen`}
          onClick={onRemove}
        >
          <X />
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2 pl-8">
        <div className="flex w-32 flex-col gap-1">
          <Label htmlFor={amountInputId(draft.id)} className="text-xs text-muted-foreground">
            {UNIT_LABELS[draft.unit].input}
          </Label>
          <Input
            id={amountInputId(draft.id)}
            inputMode="decimal"
            value={draft.amount}
            placeholder="optional"
            aria-invalid={invalid}
            onChange={(event) => {
              onChange({ ...draft, amount: event.target.value });
            }}
          />
        </div>
        {units.length > 1 && (
          <div className="flex w-32 flex-col gap-1">
            <Label htmlFor={`${prefix}-unit`} className="text-xs text-muted-foreground">
              Einheit
            </Label>
            <NativeSelect
              id={`${prefix}-unit`}
              className="w-full"
              value={draft.unit}
              onChange={(event) => {
                if (isOneOf(units, event.target.value)) {
                  onChange({ ...draft, unit: event.target.value });
                }
              }}
            >
              {units.map((unit) => (
                <NativeSelectOption key={unit} value={unit}>
                  {UNIT_LABELS[unit].input}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}
        {isWeighted(draft.exercise) && (
          <div className="flex w-32 flex-col gap-1">
            <Label htmlFor={`${prefix}-kg`} className="text-xs text-muted-foreground">
              Gewicht (kg)
            </Label>
            <Input
              id={`${prefix}-kg`}
              inputMode="decimal"
              value={draft.kg}
              placeholder="optional"
              aria-invalid={invalid}
              onChange={(event) => {
                onChange({ ...draft, kg: event.target.value });
              }}
            />
          </div>
        )}
        {hasBox(draft.exercise) && (
          <div className="flex w-32 flex-col gap-1">
            <Label htmlFor={`${prefix}-box`} className="text-xs text-muted-foreground">
              Box (Zoll)
            </Label>
            <NativeSelect
              id={`${prefix}-box`}
              className="w-full"
              value={draft.box}
              aria-invalid={invalid}
              onChange={(event) => {
                onChange({ ...draft, box: event.target.value });
              }}
            >
              {draft.box === "" && <NativeSelectOption value="">Bitte wählen</NativeSelectOption>}
              {boxChoices(draft.box).map((inches) => (
                <NativeSelectOption key={inches} value={String(inches)}>
                  {`${String(inches)} Zoll`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}
      </div>
    </div>
  );
}
