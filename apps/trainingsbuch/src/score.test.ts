import { describe, expect, it } from "vitest";
import type { Result, Score } from "./schema.ts";
import {
  bestResult,
  compareResults,
  formatKg,
  formatScore,
  formatSeconds,
  inputFromScore,
  parseCount,
  parseKg,
  parseTime,
  scoreFromInput,
  type ScoreInput,
} from "./score.ts";

function result(id: string, score: Score, extra: Partial<Result> = {}): Result {
  return {
    id,
    workoutId: "fran",
    date: "2026-11-01",
    division: "rx",
    score,
    loadKg: null,
    notes: "",
    ...extra,
  };
}

const EMPTY: ScoreInput = { minutes: "", seconds: "", capped: false, rounds: "", reps: "", kg: "" };

describe("formatting", () => {
  it("formats times with and without hours", () => {
    expect(formatSeconds(245)).toBe("4:05");
    expect(formatSeconds(59)).toBe("0:59");
    expect(formatSeconds(3725)).toBe("1:02:05");
  });

  it("formats each kind of score in German", () => {
    expect(formatScore({ kind: "time", seconds: 245 })).toBe("4:05");
    expect(formatScore({ kind: "reps", reps: 150 })).toBe("150 Wdh.");
    expect(formatScore({ kind: "rounds-reps", rounds: 12, reps: 5 })).toBe("12 Runden + 5 Wdh.");
    expect(formatScore({ kind: "rounds-reps", rounds: 12, reps: 0 })).toBe("12 Runden");
    expect(formatScore({ kind: "load", kg: 102.5 })).toBe("102,5 kg");
    expect(formatKg(1250)).toBe("1.250 kg");
  });
});

describe("best result", () => {
  it("prefers a faster time, more reps, more rounds and more weight", () => {
    const fast = result("a", { kind: "time", seconds: 200 });
    const slow = result("b", { kind: "time", seconds: 300 });
    expect(compareResults(fast, slow)).toBeLessThan(0);
    expect(
      compareResults(
        result("c", { kind: "rounds-reps", rounds: 10, reps: 1 }),
        result("d", { kind: "rounds-reps", rounds: 9, reps: 30 }),
      ),
    ).toBeLessThan(0);
    expect(
      compareResults(result("e", { kind: "load", kg: 80 }), result("f", { kind: "load", kg: 100 })),
    ).toBeGreaterThan(0);
    expect(
      compareResults(
        result("g", { kind: "reps", reps: 5 }),
        result("h", { kind: "reps", reps: 5 }),
      ),
    ).toBe(0);
  });

  it("puts a finished time before a capped result", () => {
    expect(
      compareResults(
        result("a", { kind: "time", seconds: 1199 }),
        result("b", { kind: "reps", reps: 400 }),
      ),
    ).toBeLessThan(0);
  });

  it("puts Rx before Scaled, also with a worse score", () => {
    const rx = result("a", { kind: "time", seconds: 600 });
    const scaled = result("b", { kind: "time", seconds: 200 }, { division: "scaled" });
    expect(compareResults(rx, scaled)).toBeLessThan(0);
    expect(compareResults(scaled, rx)).toBeGreaterThan(0);
    expect(bestResult([scaled, rx])).toBe(rx);
  });

  it("counts a result without a mark like Rx", () => {
    const none = result("a", { kind: "time", seconds: 600 }, { division: null });
    const rx = result("b", { kind: "time", seconds: 500 });
    const scaled = result("c", { kind: "time", seconds: 200 }, { division: "scaled" });
    expect(compareResults(none, scaled)).toBeLessThan(0);
    expect(compareResults(rx, none)).toBeLessThan(0);
    expect(bestResult([scaled, none])).toBe(none);
  });

  it("finds no best result in an empty list and the earlier result in a tie", () => {
    expect(bestResult([])).toBeNull();
    const later = result("a", { kind: "reps", reps: 5 }, { date: "2026-11-05" });
    const earlier = result("b", { kind: "reps", reps: 5 }, { date: "2026-10-01" });
    const worse = result("c", { kind: "reps", reps: 4 }, { date: "2026-09-01" });
    expect(bestResult([later, earlier, worse])).toBe(earlier);
    expect(bestResult([earlier, later])).toBe(earlier);
  });
});

describe("parsing", () => {
  it("reads whole numbers", () => {
    expect(parseCount("12")).toBe(12);
    expect(parseCount(" ")).toBeNull();
    expect(parseCount("", true)).toBe(0);
    expect(parseCount("-1")).toBeNull();
    expect(parseCount("1,5")).toBeNull();
    expect(parseCount("abc")).toBeNull();
  });

  it("reads times from minutes and seconds", () => {
    expect(parseTime("4", "5")).toBe(245);
    expect(parseTime("", "45")).toBe(45);
    expect(parseTime("62", "")).toBe(3720);
    expect(parseTime("", "")).toBeNull();
    expect(parseTime("0", "0")).toBeNull();
    expect(parseTime("4", "60")).toBeNull();
    expect(parseTime("x", "1")).toBeNull();
    expect(parseTime("1", "x")).toBeNull();
  });

  it("reads weights in German", () => {
    expect(parseKg("102,5")).toBe(102.5);
    expect(parseKg("60")).toBe(60);
    expect(parseKg("0")).toBeNull();
    expect(parseKg("1001")).toBeNull();
    expect(parseKg("")).toBeNull();
  });
});

describe("score inputs", () => {
  it("builds a score for each score type", () => {
    expect(scoreFromInput("time", { ...EMPTY, minutes: "3", seconds: "7" })).toEqual({
      kind: "ok",
      score: { kind: "time", seconds: 187 },
    });
    expect(scoreFromInput("time-or-reps", { ...EMPTY, capped: true, reps: "180" })).toEqual({
      kind: "ok",
      score: { kind: "reps", reps: 180 },
    });
    expect(scoreFromInput("time-or-reps", { ...EMPTY, minutes: "9" })).toEqual({
      kind: "ok",
      score: { kind: "time", seconds: 540 },
    });
    expect(scoreFromInput("reps", { ...EMPTY, reps: "300" })).toEqual({
      kind: "ok",
      score: { kind: "reps", reps: 300 },
    });
    expect(scoreFromInput("rounds-reps", { ...EMPTY, rounds: "20" })).toEqual({
      kind: "ok",
      score: { kind: "rounds-reps", rounds: 20, reps: 0 },
    });
    expect(scoreFromInput("load", { ...EMPTY, kg: "142,5" })).toEqual({
      kind: "ok",
      score: { kind: "load", kg: 142.5 },
    });
  });

  it("gives a German message for a wrong input", () => {
    expect(scoreFromInput("time", EMPTY)).toEqual({
      kind: "error",
      message: "Bitte eine Zeit eingeben, z. B. 4 Minuten und 5 Sekunden.",
    });
    expect(scoreFromInput("reps", EMPTY)).toMatchObject({ kind: "error" });
    expect(scoreFromInput("rounds-reps", EMPTY)).toEqual({
      kind: "error",
      message: "Bitte die Runden als ganze Zahl eingeben.",
    });
    expect(scoreFromInput("rounds-reps", { ...EMPTY, rounds: "3", reps: "x" })).toEqual({
      kind: "error",
      message: "Bitte die Wiederholungen als ganze Zahl eingeben.",
    });
    expect(scoreFromInput("load", { ...EMPTY, kg: "schwer" })).toMatchObject({ kind: "error" });
  });

  it("fills the inputs from a saved score, and back", () => {
    const scores: Score[] = [
      { kind: "time", seconds: 187 },
      { kind: "reps", reps: 180 },
      { kind: "rounds-reps", rounds: 20, reps: 3 },
      { kind: "load", kg: 102.5 },
    ];
    expect(scores.map(inputFromScore)).toEqual([
      { ...EMPTY, minutes: "3", seconds: "7" },
      { ...EMPTY, capped: true, reps: "180" },
      { ...EMPTY, rounds: "20", reps: "3" },
      { ...EMPTY, kg: "102,5" },
    ]);
    expect(inputFromScore(null)).toEqual(EMPTY);
    // No thousands dot: "1.000" would read back as 1.
    expect(inputFromScore({ kind: "load", kg: 1000 }).kg).toBe("1000");
  });
});
