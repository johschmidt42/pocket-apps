import { describe, expect, it } from "vitest";
import { elapsedAt, type Run, runReducer } from "./run.ts";
import type { TimerConfig } from "./timer.ts";

/** The lead-in of the timers in these tests: 10 s. */
const LEAD_IN_MS = 10_000;

const amrap: TimerConfig = { leadInSeconds: 10, mode: "amrap", seconds: 60 };
const setup: Run = { status: "setup" };

describe("runReducer", () => {
  it("starts a run at the clock time", () => {
    const run = runReducer(setup, { type: "start", config: amrap, now: 1000 });

    expect(run).toEqual({
      status: "running",
      config: amrap,
      startedAt: 1000,
      elapsedBefore: 0,
      rounds: 0,
    });
    expect(elapsedAt(run, 4000)).toBe(3000);
  });

  it("does not count the time of a pause", () => {
    let run = runReducer(setup, { type: "start", config: amrap, now: 0 });
    run = runReducer(run, { type: "pause", now: 5000 });
    expect(elapsedAt(run, 60_000)).toBe(5000);

    run = runReducer(run, { type: "resume", now: 60_000 });
    expect(elapsedAt(run, 62_000)).toBe(7000);
  });

  it("never gives a negative time", () => {
    const run = runReducer(setup, { type: "start", config: amrap, now: 1000 });

    expect(elapsedAt(run, 500)).toBe(0);
  });

  it("finishes at the clock time, but not after the end", () => {
    const running = runReducer(setup, { type: "start", config: amrap, now: 0 });

    expect(runReducer(running, { type: "finish", now: 20_000 })).toMatchObject({
      status: "finished",
      elapsed: 20_000,
    });
    expect(runReducer(running, { type: "finish", now: 999_999 })).toMatchObject({
      status: "finished",
      elapsed: LEAD_IN_MS + 60_000,
    });
  });

  it("finishes a paused run and a run without an end", () => {
    const forTime: TimerConfig = { leadInSeconds: 10, mode: "for-time", capSeconds: null };
    let run = runReducer(setup, { type: "start", config: forTime, now: 0 });
    run = runReducer(run, { type: "pause", now: 999_999 });

    expect(runReducer(run, { type: "finish", now: 2_000_000 })).toMatchObject({
      status: "finished",
      elapsed: 999_999,
    });
  });

  it("counts rounds, but not below 0", () => {
    let run = runReducer(setup, { type: "start", config: amrap, now: 0 });
    run = runReducer(run, { type: "count-round", change: 1 });
    run = runReducer(run, { type: "count-round", change: 1 });
    run = runReducer(run, { type: "count-round", change: -1 });
    expect(run).toMatchObject({ rounds: 1 });

    run = runReducer(run, { type: "count-round", change: -1 });
    run = runReducer(run, { type: "count-round", change: -1 });
    expect(run).toMatchObject({ rounds: 0 });
  });

  it("goes back to the setup", () => {
    const run = runReducer(setup, { type: "start", config: amrap, now: 0 });

    expect(runReducer(run, { type: "reset" })).toEqual(setup);
    expect(elapsedAt(setup, 1000)).toBe(0);
  });

  it("ignores actions that do not fit the status", () => {
    const running = runReducer(setup, { type: "start", config: amrap, now: 0 });
    const finished = runReducer(running, { type: "finish", now: 1000 });

    expect(runReducer(running, { type: "resume", now: 1 })).toBe(running);
    expect(runReducer(finished, { type: "pause", now: 1 })).toBe(finished);
    expect(runReducer(finished, { type: "finish", now: 1 })).toBe(finished);
    expect(runReducer(finished, { type: "count-round", change: 1 })).toBe(finished);
  });
});
