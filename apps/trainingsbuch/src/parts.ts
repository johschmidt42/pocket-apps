import { parseNumber } from "@pocket-apps/core/numbers";
import { decimalInput } from "./decimal.ts";
import {
  DEFAULT_BOX_INCHES,
  DEFAULT_BOX_INCHES_WOMEN,
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
  /** The load for men, or for all if `kgWomen` is empty. */
  kg: string;
  /** The load for women. "": the same as `kg`. */
  kgWomen: string;
  /** The box height in inches for men, or "" if the user did not choose one yet. */
  boxInches: string;
  /** The box height for women. "": the same as `boxInches`. */
  boxInchesWomen: string;
};

function optionalInput(value: number | null): string {
  return value === null ? "" : decimalInput(value);
}

function optionalInches(value: number | null): string {
  return value === null ? "" : String(value);
}

/** The DOM ID of the first input of a row. The form moves the focus there after "add". */
export function amountInputId(id: string): string {
  return `part-${id}-amount`;
}

/** A new, empty row for the exercise, with its default unit and the usual box heights. */
export function newPartDraft(exercise: ExerciseId, id: string): PartDraft {
  const box = hasBox(exercise);
  return {
    id,
    exercise,
    amount: "",
    unit: unitsOf(exercise)[0] ?? "reps",
    kg: "",
    kgWomen: "",
    boxInches: box ? String(DEFAULT_BOX_INCHES) : "",
    boxInchesWomen: box ? String(DEFAULT_BOX_INCHES_WOMEN) : "",
  };
}

export function draftFromPart(part: Part): PartDraft {
  return {
    id: part.id,
    exercise: part.exercise,
    amount: optionalInput(part.amount),
    unit: part.unit,
    kg: optionalInput(part.kg),
    kgWomen: optionalInput(part.kgWomen),
    boxInches: optionalInches(part.boxInches),
    boxInchesWomen: optionalInches(part.boxInchesWomen),
  };
}

export type PartCheck = { kind: "ok"; part: Part } | { kind: "error"; message: string };

type Read<T> = { kind: "ok"; value: T } | { kind: "error"; message: string };

/** The loads for men and for women. Both are optional. A load for women needs one for men. */
function readLoads(
  draft: PartDraft,
  name: string,
): Read<{ kg: number | null; kgWomen: number | null }> {
  if (!isWeighted(draft.exercise)) return { kind: "ok", value: { kg: null, kgWomen: null } };
  const kg = draft.kg.trim() === "" ? null : parseKg(draft.kg);
  const kgWomen = draft.kgWomen.trim() === "" ? null : parseKg(draft.kgWomen);
  if (
    (draft.kg.trim() !== "" && kg === null) ||
    (draft.kgWomen.trim() !== "" && kgWomen === null)
  ) {
    return { kind: "error", message: `${name}: Bitte das Gewicht in kg eingeben, z. B. 42,5.` };
  }
  if (kg === null && kgWomen !== null) {
    return { kind: "error", message: `${name}: Bitte zuerst das Gewicht für Männer eingeben.` };
  }
  return { kind: "ok", value: { kg, kgWomen: kgWomen === kg ? null : kgWomen } };
}

/** The box heights for men and for women. The height for men is required. */
function readBoxes(
  draft: PartDraft,
  name: string,
): Read<{ boxInches: number | null; boxInchesWomen: number | null }> {
  if (!hasBox(draft.exercise)) {
    return { kind: "ok", value: { boxInches: null, boxInchesWomen: null } };
  }
  // The selects give only whole numbers. An empty choice is 0.
  const boxInches = Number(draft.boxInches);
  if (!Number.isInteger(boxInches) || boxInches <= 0) {
    return { kind: "error", message: `${name}: Bitte die Boxhöhe in Zoll wählen.` };
  }
  const women = Number(draft.boxInchesWomen);
  const boxInchesWomen = women > 0 && women !== boxInches ? women : null;
  return { kind: "ok", value: { boxInches, boxInchesWomen } };
}

/**
 * The part from the inputs, or a German error message. Amount and loads are optional. An
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
  const loads = readLoads(draft, name);
  if (loads.kind === "error") return loads;
  const boxes = readBoxes(draft, name);
  if (boxes.kind === "error") return boxes;
  return {
    kind: "ok",
    part: {
      id: draft.id,
      exercise: draft.exercise,
      amount,
      unit: draft.unit,
      ...loads.value,
      ...boxes.value,
    },
  };
}
