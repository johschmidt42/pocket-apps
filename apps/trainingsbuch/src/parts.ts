import { parseNumber } from "@pocket-apps/core/numbers";
import { decimalInput } from "./decimal.ts";
import {
  DEFAULT_BOX_INCHES,
  EXERCISE_NAMES,
  hasBox,
  isWeighted,
  unitsOf,
  UNIT_LABELS,
  type ExerciseId,
  type Unit,
} from "./exercises.ts";
import type { Part } from "./schema.ts";
import { parseKg } from "./score.ts";

/** One exercise in the form of an own workout. The inputs are text. */
export type PartDraft = {
  id: string;
  exercise: ExerciseId;
  amount: string;
  unit: Unit;
  kg: string;
  /** The box height in inches, or "" if the user did not choose one yet. */
  boxInches: string;
};

function optionalInput(value: number | null): string {
  return value === null ? "" : decimalInput(value);
}

/** The DOM ID of the first input of a row. The form moves the focus there after "add". */
export function amountInputId(id: string): string {
  return `part-${id}-amount`;
}

/** A new, empty row for the exercise, with its default unit. */
export function newPartDraft(exercise: ExerciseId, id: string): PartDraft {
  return {
    id,
    exercise,
    amount: "",
    unit: unitsOf(exercise)[0] ?? "reps",
    kg: "",
    boxInches: hasBox(exercise) ? String(DEFAULT_BOX_INCHES) : "",
  };
}

export function draftFromPart(part: Part): PartDraft {
  return {
    id: part.id,
    exercise: part.exercise,
    amount: optionalInput(part.amount),
    unit: part.unit,
    kg: optionalInput(part.kg),
    boxInches: part.boxInches === null ? "" : String(part.boxInches),
  };
}

export type PartCheck = { kind: "ok"; part: Part } | { kind: "error"; message: string };

/**
 * The part from the inputs, or a German error message. Amount and weight are optional. An
 * exercise with a box needs its height.
 * Reps and calories are whole numbers. Meters and seconds can have decimals.
 */
export function partFromDraft(draft: PartDraft): PartCheck {
  const name = EXERCISE_NAMES[draft.exercise];
  let amount: number | null = null;
  if (draft.amount.trim() !== "") {
    amount = parseNumber(draft.amount);
    const whole = draft.unit === "reps" || draft.unit === "cal";
    if (
      amount === null ||
      amount <= 0 ||
      amount > 100_000 ||
      (whole && !Number.isInteger(amount))
    ) {
      return {
        kind: "error",
        message: `${name}: Bitte ${UNIT_LABELS[draft.unit].input} als Zahl eingeben${whole ? " (ganze Zahl)" : ""}.`,
      };
    }
  }
  let kg: number | null = null;
  if (isWeighted(draft.exercise) && draft.kg.trim() !== "") {
    kg = parseKg(draft.kg);
    if (kg === null) {
      return { kind: "error", message: `${name}: Bitte das Gewicht in kg eingeben, z. B. 42,5.` };
    }
  }
  let boxInches: number | null = null;
  if (hasBox(draft.exercise)) {
    boxInches = Number(draft.boxInches);
    // The select gives only whole numbers. An empty choice is 0.
    if (!Number.isInteger(boxInches) || boxInches <= 0) {
      return { kind: "error", message: `${name}: Bitte die Boxhöhe in Zoll wählen.` };
    }
  }
  return {
    kind: "ok",
    part: { id: draft.id, exercise: draft.exercise, amount, unit: draft.unit, kg, boxInches },
  };
}
