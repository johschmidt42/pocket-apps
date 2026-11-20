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
      boxInches: "",
      kgWomen: "",
      boxInchesWomen: "",
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
      boxInches: "",
      kgWomen: "",
      boxInchesWomen: "",
    });
    expect(check).toEqual({
      kind: "ok",
      part: {
        id: "a",
        exercise: "thruster",
        amount: 21,
        unit: "reps",
        kg: 42.5,
        boxInches: null,
        kgWomen: null,
        boxInchesWomen: null,
      },
    });
    if (check.kind !== "ok") throw new Error("expected a part");
    expect(draftFromPart(check.part)).toEqual({
      id: "a",
      exercise: "thruster",
      amount: "21",
      unit: "reps",
      kg: "42,5",
      boxInches: "",
      kgWomen: "",
      boxInchesWomen: "",
    });
    expect(
      partFromDraft({
        id: "b",
        exercise: "run",
        amount: "",
        unit: "m",
        kg: "",
        boxInches: "",
        kgWomen: "",
        boxInchesWomen: "",
      }),
    ).toEqual({
      kind: "ok",
      part: {
        id: "b",
        exercise: "run",
        amount: null,
        unit: "m",
        kg: null,
        boxInches: null,
        kgWomen: null,
        boxInchesWomen: null,
      },
    });
    expect(
      partFromDraft({
        id: "c",
        exercise: "l-sit",
        amount: "12,5",
        unit: "s",
        kg: "",
        boxInches: "",
        kgWomen: "",
        boxInchesWomen: "",
      }),
    ).toMatchObject({
      kind: "ok",
      part: { amount: 12.5 },
    });
  });

  it("ignores a weight for an exercise without a weight", () => {
    expect(
      partFromDraft({
        id: "a",
        exercise: "burpee",
        amount: "10",
        unit: "reps",
        kg: "20",
        boxInches: "",
        kgWomen: "",
        boxInchesWomen: "",
      }),
    ).toMatchObject({
      kind: "ok",
      part: { kg: null },
    });
  });

  it("gives a German message for a wrong input", () => {
    expect(
      partFromDraft({
        id: "a",
        exercise: "burpee",
        amount: "10,5",
        unit: "reps",
        kg: "",
        boxInches: "",
        kgWomen: "",
        boxInchesWomen: "",
      }),
    ).toEqual({
      kind: "error",
      message: "Burpee: Bitte Wiederholungen als Zahl eingeben (ganze Zahl).",
    });
    expect(
      partFromDraft({
        id: "a",
        exercise: "run",
        amount: "-1",
        unit: "m",
        kg: "",
        boxInches: "",
        kgWomen: "",
        boxInchesWomen: "",
      }),
    ).toEqual({
      kind: "error",
      message: "Run: Bitte Meter als Zahl eingeben.",
    });
    expect(
      partFromDraft({
        id: "a",
        exercise: "run",
        amount: "x",
        unit: "m",
        kg: "",
        boxInches: "",
        kgWomen: "",
        boxInchesWomen: "",
      }),
    ).toMatchObject({ kind: "error" });
    expect(
      partFromDraft({
        id: "a",
        exercise: "run",
        amount: "200000",
        unit: "m",
        kg: "",
        boxInches: "",
        kgWomen: "",
        boxInchesWomen: "",
      }),
    ).toMatchObject({ kind: "error" });
    expect(
      partFromDraft({
        id: "a",
        exercise: "deadlift",
        amount: "5",
        unit: "reps",
        kg: "schwer",
        boxInches: "",
        kgWomen: "",
        boxInchesWomen: "",
      }),
    ).toEqual({
      kind: "error",
      message: "Deadlift: Bitte das Gewicht in kg eingeben, z. B. 42,5.",
    });
  });

  it("reads loads and box heights for women", () => {
    const draft = {
      id: "a",
      amount: "5",
      unit: "reps" as const,
      kg: "",
      kgWomen: "",
      boxInches: "",
      boxInchesWomen: "",
    };
    const deadlift = { ...draft, exercise: "deadlift" as const, kg: "52,5", kgWomen: "35" };
    const check = partFromDraft(deadlift);
    expect(check).toEqual({
      kind: "ok",
      part: {
        id: "a",
        exercise: "deadlift",
        amount: 5,
        unit: "reps",
        kg: 52.5,
        kgWomen: 35,
        boxInches: null,
        boxInchesWomen: null,
      },
    });
    if (check.kind !== "ok") throw new Error("expected a part");
    expect(draftFromPart(check.part)).toEqual(deadlift);
    // The same value as for men is no own value for women.
    expect(partFromDraft({ ...deadlift, kgWomen: "52,5" })).toMatchObject({
      part: { kgWomen: null },
    });
    expect(partFromDraft({ ...deadlift, kg: "", kgWomen: "35" })).toEqual({
      kind: "error",
      message: "Deadlift: Bitte zuerst das Gewicht für Männer eingeben.",
    });
    expect(partFromDraft({ ...deadlift, kgWomen: "leicht" })).toEqual({
      kind: "error",
      message: "Deadlift: Bitte das Gewicht in kg eingeben, z. B. 42,5.",
    });

    const jump = { ...draft, exercise: "box-jump" as const, boxInches: "30", boxInchesWomen: "24" };
    expect(newPartDraft("box-jump", "b")).toMatchObject({ boxInches: "24", boxInchesWomen: "20" });
    expect(partFromDraft(jump)).toMatchObject({ part: { boxInches: 30, boxInchesWomen: 24 } });
    expect(partFromDraft({ ...jump, boxInchesWomen: "30" })).toMatchObject({
      part: { boxInchesWomen: null },
    });
    expect(partFromDraft({ ...jump, boxInches: "" })).toEqual({
      kind: "error",
      message: "Box Jump: Bitte die Boxhöhe in Zoll wählen.",
    });
  });
});
