import { describe, expect, it } from "vitest";
import { amountInputId, draftFromPart, newPartDraft, partFromDraft } from "./parts.ts";

describe("parts of an own workout", () => {
  it("starts a row with the default unit of the exercise", () => {
    expect(newPartDraft("thruster", "a")).toEqual({
      id: "a",
      exercise: "thruster",
      amount: "",
      unit: "reps",
      kg: "",
    });
    expect(newPartDraft("bike", "b").unit).toBe("cal");
    expect(amountInputId("a")).toBe("part-a-amount");
  });

  it("reads the inputs, and writes them back", () => {
    const check = partFromDraft({
      id: "a",
      exercise: "thruster",
      amount: "21",
      unit: "reps",
      kg: "42,5",
    });
    expect(check).toEqual({
      kind: "ok",
      part: { id: "a", exercise: "thruster", amount: 21, unit: "reps", kg: 42.5 },
    });
    if (check.kind !== "ok") throw new Error("expected a part");
    expect(draftFromPart(check.part)).toEqual({
      id: "a",
      exercise: "thruster",
      amount: "21",
      unit: "reps",
      kg: "42,5",
    });
    expect(partFromDraft({ id: "b", exercise: "run", amount: "", unit: "m", kg: "" })).toEqual({
      kind: "ok",
      part: { id: "b", exercise: "run", amount: null, unit: "m", kg: null },
    });
    expect(
      partFromDraft({ id: "c", exercise: "l-sit", amount: "12,5", unit: "s", kg: "" }),
    ).toMatchObject({
      kind: "ok",
      part: { amount: 12.5 },
    });
  });

  it("ignores a weight for an exercise without a weight", () => {
    expect(
      partFromDraft({ id: "a", exercise: "burpee", amount: "10", unit: "reps", kg: "20" }),
    ).toMatchObject({
      kind: "ok",
      part: { kg: null },
    });
  });

  it("gives a German message for a wrong input", () => {
    expect(
      partFromDraft({ id: "a", exercise: "burpee", amount: "10,5", unit: "reps", kg: "" }),
    ).toEqual({
      kind: "error",
      message: "Burpee: Bitte Wiederholungen als Zahl eingeben (ganze Zahl).",
    });
    expect(partFromDraft({ id: "a", exercise: "run", amount: "-1", unit: "m", kg: "" })).toEqual({
      kind: "error",
      message: "Run: Bitte Meter als Zahl eingeben.",
    });
    expect(
      partFromDraft({ id: "a", exercise: "run", amount: "x", unit: "m", kg: "" }),
    ).toMatchObject({ kind: "error" });
    expect(
      partFromDraft({ id: "a", exercise: "run", amount: "200000", unit: "m", kg: "" }),
    ).toMatchObject({ kind: "error" });
    expect(
      partFromDraft({ id: "a", exercise: "deadlift", amount: "5", unit: "reps", kg: "schwer" }),
    ).toEqual({
      kind: "error",
      message: "Deadlift: Bitte das Gewicht in kg eingeben, z. B. 42,5.",
    });
  });
});
