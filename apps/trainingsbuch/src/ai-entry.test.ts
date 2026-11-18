import { describe, expect, it } from "vitest";
import {
  aiAnswerSchema,
  buildInstructions,
  checkDraft,
  fixRequest,
  workoutLine,
  type AiDraft,
} from "./ai-entry.ts";
import { CATALOG } from "./catalog.ts";
import type { Logbook, OwnWorkout } from "./schema.ts";
import { fromOwn, type Workout } from "./workouts.ts";

const TODAY = "2026-11-18";

const OWN: OwnWorkout = {
  id: "own1",
  name: "Montag Chipper",
  scoreType: "time-or-reps",
  timeCapMinutes: 12,
  rounds: null,
  parts: [{ id: "p1", exercise: "wall-ball", amount: 50, unit: "reps", kg: 9 }],
  notes: "Ruhig angehen",
};

const DATA: Logbook = { workouts: [OWN], results: [], units: "metric" };

function workout(id: string): Workout {
  const found = CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

const NO_SCORE = { seconds: null, capped: false, rounds: null, reps: null, kg: null };

function draft(patch: Partial<AiDraft> = {}): AiDraft {
  return {
    workoutId: "fran",
    newWorkout: null,
    date: TODAY,
    division: "rx",
    score: { ...NO_SCORE, seconds: 402 },
    loadKg: null,
    notes: " Pull-ups in 3 Sätzen ",
    ...patch,
  };
}

function check(patch: Partial<AiDraft>, focus: Workout | null = null) {
  return checkDraft(draft(patch), { data: DATA, focus, today: TODAY });
}

function problem(patch: Partial<AiDraft>, focus: Workout | null = null): string {
  const result = check(patch, focus);
  if (result.kind !== "problem") throw new Error("no problem");
  return result.problem;
}

const NEW_WORKOUT: NonNullable<AiDraft["newWorkout"]> = {
  name: " WOD Mittwoch ",
  scoreType: "rounds-reps",
  timeCapMinutes: 12,
  rounds: 3,
  parts: [
    { exercise: "wall-ball", amount: 10, unit: "reps", kg: 9 },
    { exercise: "row", amount: 15, unit: "cal", kg: null },
    // An exercise without a weight loses the kg.
    { exercise: "double-under", amount: 20, unit: "reps", kg: 5 },
  ],
  notes: "",
};

describe("instructions for the AI", () => {
  it("lists the workouts with id, name, scoring and exercises", () => {
    expect(workoutLine(workout("fran"))).toBe("fran · Fran · for time · thruster, pull-up");
    expect(workoutLine(fromOwn(OWN))).toBe(
      "own1 · Montag Chipper · for time with time cap 12 min · wall-ball",
    );

    const text = buildInstructions({
      today: TODAY,
      units: "metric",
      workouts: [workout("fran"), fromOwn(OWN)],
      focus: null,
    });
    expect(text).toContain("Today is Wednesday, 2026-11-18.");
    expect(text).toContain("The user thinks in kg.");
    expect(text).toContain("fran · Fran · for time · thruster, pull-up");
    expect(text).toContain("create it as a new own workout");
  });

  it("gives only the open workout, with its full text", () => {
    const text = buildInstructions({
      today: TODAY,
      units: "imperial",
      workouts: [workout("fran")],
      focus: fromOwn(OWN),
    });
    expect(text).toContain('Use workoutId "own1" and newWorkout null');
    expect(text).toContain("50 × Wall Ball, 9 kg");
    expect(text).toContain("Ruhig angehen");
    expect(text).toContain("Convert lb to kg");
    expect(text).not.toContain("fran · Fran");

    // A built-in workout has no extra notes.
    expect(
      buildInstructions({ today: TODAY, units: "metric", workouts: [], focus: workout("fran") }),
    ).toContain("21-15-9 reps for time of:");
  });

  it("asks the AI to fix a problem", () => {
    expect(fixRequest("Bad.")).toBe("The app cannot use your draft: Bad. Give a corrected answer.");
  });

  it("describes the answer for the provider", () => {
    expect(aiAnswerSchema.parse({ status: "question", message: "Rx?", draft: null })).toEqual({
      status: "question",
      message: "Rx?",
      draft: null,
    });
  });
});

describe("check of a draft", () => {
  it("makes a result for a known workout", () => {
    const result = check({});
    expect(result).toMatchObject({
      kind: "ok",
      entry: {
        workout: { id: "fran" },
        newWorkout: null,
        result: {
          workoutId: "fran",
          date: TODAY,
          division: "rx",
          score: { kind: "time", seconds: 402 },
          loadKg: null,
          notes: "Pull-ups in 3 Sätzen",
        },
      },
    });
  });

  it("uses the open workout, also when the AI gives another one", () => {
    const result = check({ workoutId: "grace", newWorkout: NEW_WORKOUT }, workout("fran"));
    expect(result).toMatchObject({
      kind: "ok",
      entry: { workout: { id: "fran" }, newWorkout: null },
    });
  });

  it("makes a new own workout", () => {
    const result = check({
      workoutId: null,
      newWorkout: NEW_WORKOUT,
      division: null,
      score: { ...NO_SCORE, rounds: 7, reps: 12 },
    });
    if (result.kind !== "ok") throw new Error(result.problem);
    const { newWorkout, workout: made, result: made2 } = result.entry;
    expect(newWorkout).toMatchObject({
      name: "WOD Mittwoch",
      scoreType: "rounds-reps",
      timeCapMinutes: 12,
      // An AMRAP has no rounds.
      rounds: null,
      parts: [
        { exercise: "wall-ball", amount: 10, unit: "reps", kg: 9 },
        { exercise: "row", amount: 15, unit: "cal", kg: null },
        { exercise: "double-under", amount: 20, unit: "reps", kg: null },
      ],
    });
    expect(made.category).toBe("own");
    expect(made2).toMatchObject({
      workoutId: newWorkout?.id,
      score: { kind: "rounds-reps", rounds: 7, reps: 12 },
    });
  });

  it("keeps the rounds and drops a time cap that the score type does not use", () => {
    const result = check({
      workoutId: null,
      newWorkout: { ...NEW_WORKOUT, scoreType: "time", rounds: 3, timeCapMinutes: 20 },
    });
    expect(result).toMatchObject({
      kind: "ok",
      entry: { newWorkout: { rounds: 3, timeCapMinutes: null } },
    });
    const once = check({
      workoutId: null,
      newWorkout: { ...NEW_WORKOUT, scoreType: "time", rounds: 1 },
    });
    expect(once).toMatchObject({ kind: "ok", entry: { newWorkout: { rounds: null } } });
  });

  it("finds problems with the workout", () => {
    expect(problem({ workoutId: "nope" })).toContain('There is no workout with the id "nope"');
    expect(problem({ workoutId: null })).toBe("Give a workoutId from the list or a newWorkout.");
    const bad = (patch: Partial<NonNullable<AiDraft["newWorkout"]>>) =>
      problem({ workoutId: null, newWorkout: { ...NEW_WORKOUT, ...patch } });
    expect(bad({ name: " " })).toBe("The new workout needs a name.");
    expect(bad({ name: "fran" })).toBe('The name "fran" is taken. Choose another name.');
    expect(bad({ parts: [] })).toBe("The new workout needs at least one exercise.");
    expect(bad({ parts: [{ exercise: "row", amount: 10, unit: "reps", kg: null }] })).toBe(
      "row takes only these units: m, cal.",
    );
    expect(bad({ parts: [{ exercise: "burpee", amount: 0, unit: "reps", kg: null }] })).toBe(
      "The amount of burpee must be more than 0, or null.",
    );
    expect(bad({ parts: [{ exercise: "thruster", amount: 21, unit: "reps", kg: -1 }] })).toBe(
      "The load of thruster must be more than 0 kg, or null.",
    );
    expect(bad({ scoreType: "time-or-reps", timeCapMinutes: null })).toContain(
      "needs timeCapMinutes",
    );
  });

  it("finds problems with the day and the weight", () => {
    expect(problem({ date: "18.11.2026" })).toBe(
      '"18.11.2026" is not a day in the form YYYY-MM-DD.',
    );
    expect(problem({ date: "2026-02-30" })).toContain("is not a day");
    expect(problem({ date: "2026-11-19" })).toBe("The day 2026-11-19 is in the future.");
    expect(problem({ loadKg: 0 })).toBe("loadKg must be more than 0, or null.");
  });

  it("needs Rx or Scaled for a built-in workout with a weight", () => {
    expect(problem({ division: null })).toBe(
      "Fran has a prescribed load. Ask the user if the result was Rx or Scaled.",
    );
    // A workout without a weight and an own workout need no mark.
    expect(
      check({ division: null, score: { ...NO_SCORE, rounds: 20 } }, workout("cindy")),
    ).toMatchObject({
      kind: "ok",
    });
    expect(
      check({ division: null, score: { ...NO_SCORE, seconds: 600 } }, fromOwn(OWN)),
    ).toMatchObject({
      kind: "ok",
    });
  });

  it("finds a time over the time cap", () => {
    expect(problem({ score: { ...NO_SCORE, seconds: 721 } }, fromOwn(OWN))).toContain(
      "longer than the time cap of 12 minutes",
    );
    expect(check({ score: { ...NO_SCORE, seconds: 720 } }, fromOwn(OWN))).toMatchObject({
      kind: "ok",
    });
  });

  it("makes the score for each score type", () => {
    const score = (id: string, values: Partial<AiDraft["score"]>, focus = workout(id)) =>
      check({ score: { ...NO_SCORE, ...values } }, focus);
    const own = fromOwn(OWN);

    expect(score("fran", {})).toMatchObject({ kind: "problem" });
    expect(score("fran", { seconds: 0 })).toMatchObject({
      problem: "Fran is scored by time. Give the time in seconds.",
    });
    expect(score("", { seconds: 600 }, own)).toMatchObject({
      entry: { result: { score: { kind: "time", seconds: 600 } } },
    });
    expect(score("", { capped: true, reps: 80 }, own)).toMatchObject({
      entry: { result: { score: { kind: "reps", reps: 80 } } },
    });
    expect(score("", { capped: true, reps: 1.5 }, own)).toMatchObject({
      problem: "Montag Chipper needs the reps as a whole number.",
    });

    const cindy = workout("cindy");
    expect(score("", { rounds: 20 }, cindy)).toMatchObject({
      entry: { result: { score: { kind: "rounds-reps", rounds: 20, reps: 0 } } },
    });
    expect(score("", { rounds: 20, reps: -1 }, cindy)).toMatchObject({
      problem: expect.stringContaining("rounds and reps") as unknown,
    });

    const reps = CATALOG.find((item) => item.scoreType === "reps");
    const load = CATALOG.find((item) => item.scoreType === "load");
    if (!reps || !load) throw new Error("missing score types");
    expect(score("", { reps: 150 }, reps)).toMatchObject({
      entry: { result: { score: { kind: "reps", reps: 150 } } },
    });
    expect(check({ score: { ...NO_SCORE, kg: 100 }, loadKg: 100 }, load)).toMatchObject({
      // A weight as the score needs no extra weight.
      entry: { result: { score: { kind: "load", kg: 100 }, loadKg: null } },
    });
    expect(score("", { kg: null }, load)).toMatchObject({
      problem: expect.stringContaining("heaviest load") as unknown,
    });
  });
});
