import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog.ts";
import { lineBlock, planBlocks } from "./plan.ts";

describe("blocks of a prescription", () => {
  it("finds headings, exercises with and without an amount, details and notes", () => {
    expect(planBlocks(["50-40-30-20-10 reps for time of:", "Double-under", "Sit-up"])).toEqual([
      { kind: "heading", scheme: "50-40-30-20-10", text: "reps for time of" },
      { kind: "exercise", amount: null, text: "Double-under" },
      { kind: "exercise", amount: null, text: "Sit-up" },
    ]);
    expect(lineBlock("100 pull-ups")).toEqual({
      kind: "exercise",
      amount: "100",
      text: "Pull-ups",
    });
    expect(lineBlock("1600 m run")).toEqual({ kind: "exercise", amount: "1600 m", text: "Run" });
    expect(lineBlock("50-calorie row")).toEqual({
      kind: "exercise",
      amount: "50 cal",
      text: "Row",
    });
    expect(lineBlock("14/12-calorie row")).toMatchObject({ amount: "14/12 cal", text: "Row" });
    expect(lineBlock("20 × Thruster, 43 kg")).toEqual({
      kind: "exercise",
      amount: "20 ×",
      text: "Thruster, 43 kg",
    });
    expect(lineBlock("Barbell: 43/29 kg")).toEqual({
      kind: "detail",
      label: "Barbell",
      text: "43/29 kg",
    });
    expect(lineBlock("Rest 3 minutes between rounds")).toEqual({
      kind: "note",
      text: "Rest 3 minutes between rounds",
    });
    expect(
      lineBlock("Burpee, push-up, jumping jack, sit-up and handstand (all together are 1 rep)"),
    ).toMatchObject({ kind: "note" });
  });

  it("finds a long exercise line after a heading, and time windows", () => {
    const long = "Burpee, push-up, jumping jack, sit-up and handstand (all together are 1 rep)";
    expect(lineBlock(long, true)).toEqual({ kind: "exercise", amount: null, text: long });
    expect(planBlocks(["50 reps for time of:", long])[1]).toMatchObject({ kind: "exercise" });
    expect(lineBlock("0:00-3:00: 2 rounds of 10 overhead squats")).toEqual({
      kind: "exercise",
      amount: "0:00-3:00",
      text: "2 rounds of 10 overhead squats",
    });
  });

  it("keeps the notes of an own workout as notes", () => {
    expect(planBlocks(["4 Runden:"], ["Ohne Pause"])).toEqual([
      { kind: "heading", scheme: null, text: "4 Runden" },
      { kind: "note", text: "Ohne Pause" },
    ]);
  });

  it("finds at least one exercise in each built-in workout", () => {
    const without = CATALOG.filter(
      (workout) => !planBlocks(workout.lines).some((block) => block.kind === "exercise"),
    ).map((workout) => workout.id);
    expect(without).toEqual([]);
  });
});
