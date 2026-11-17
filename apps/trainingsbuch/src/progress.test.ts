import { describe, expect, it } from "vitest";
import { progressPoints } from "./progress.ts";
import type { Result, Score } from "./schema.ts";

function result(id: string, date: string, score: Score): Result {
  return { id, workoutId: "w", date, division: "rx", score, loadKg: null, notes: "" };
}

describe("progress points", () => {
  it("needs two results of the same kind", () => {
    expect(progressPoints([])).toBeNull();
    expect(progressPoints([result("a", "2026-11-01", { kind: "time", seconds: 300 })])).toBeNull();
  });

  it("sorts oldest first and turns the axis for times", () => {
    const progress = progressPoints([
      result("b", "2026-11-03", { kind: "time", seconds: 250 }),
      result("a", "2026-01-02", { kind: "time", seconds: 300 }),
      result("c", "2026-11-03", { kind: "time", seconds: 240 }),
      result("x", "2026-11-04", { kind: "reps", reps: 80 }),
    ]);
    expect(progress).toEqual({
      lowerIsBetter: true,
      points: [
        { id: "a", day: "02.01.26", value: 300, label: "5:00", division: "rx" },
        { id: "b", day: "03.11.26", value: 250, label: "4:10", division: "rx" },
        { id: "c", day: "03.11.26", value: 240, label: "4:00", division: "rx" },
      ],
    });
  });

  it("gives values for reps, rounds and weights", () => {
    const values = (scores: Score[]) =>
      progressPoints(
        scores.map((score, index) => result(String(index), "2026-11-01", score)),
      )?.points.map((point) => point.value);
    expect(
      values([
        { kind: "reps", reps: 80 },
        { kind: "reps", reps: 90 },
      ]),
    ).toEqual([80, 90]);
    expect(
      values([
        { kind: "rounds-reps", rounds: 12, reps: 5 },
        { kind: "rounds-reps", rounds: 13, reps: 0 },
      ]),
    ).toEqual([12.005, 13]);
    expect(
      values([
        { kind: "load", kg: 80 },
        { kind: "load", kg: 82.5 },
      ]),
    ).toEqual([80, 82.5]);
    expect(
      progressPoints([
        result("a", "2026-11-01", { kind: "load", kg: 80 }),
        result("b", "2026-11-02", { kind: "load", kg: 90 }),
      ])?.lowerIsBetter,
    ).toBe(false);
  });
});
