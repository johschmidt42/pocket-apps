import { describe, expect, it } from "vitest";
import { nowPlaying } from "./now-playing.ts";
import type { Run } from "./run.ts";
import type { TimerConfig } from "./timer.ts";

const TABATA: TimerConfig = {
  mode: "tabata",
  workSeconds: 20,
  restSeconds: 10,
  rounds: 8,
  leadInSeconds: 10,
};

function running(config: TimerConfig, rounds = 0): Run {
  return { status: "running", config, startedAt: 0, elapsedBefore: 0, rounds };
}

describe("nowPlaying", () => {
  it("is empty without a running timer", () => {
    expect(nowPlaying({ status: "setup" }, 0)).toBeNull();
    expect(nowPlaying({ status: "finished", config: TABATA, elapsed: 0, rounds: 0 }, 0)).toBeNull();
  });

  it("shows the lead-in with its progress", () => {
    expect(nowPlaying(running(TABATA), 4_000)).toEqual({
      title: "Gleich geht’s los",
      subtitle: "Tabata 8 × 20 s / 10 s",
      playing: true,
      durationMs: 10_000,
      positionMs: 4_000,
    });
  });

  it("shows the phase and the round of Tabata", () => {
    // Lead-in 10 s, then round 1: work 20 s, rest 10 s. Round 2 starts at 40 s.
    expect(nowPlaying(running(TABATA), 45_000)).toMatchObject({
      title: "Arbeit · Runde 2 von 8",
      durationMs: 20_000,
      positionMs: 5_000,
    });
    expect(nowPlaying(running(TABATA), 32_000)).toMatchObject({
      title: "Pause · Runde 1 von 8",
      durationMs: 10_000,
      positionMs: 2_000,
    });
  });

  it("shows a pause", () => {
    const paused: Run = { status: "paused", config: TABATA, elapsed: 45_000, rounds: 0 };

    expect(nowPlaying(paused, 99_000)).toMatchObject({ playing: false, positionMs: 5_000 });
  });

  it("shows the counted rounds of AMRAP and For Time", () => {
    const amrap: TimerConfig = { mode: "amrap", seconds: 600, leadInSeconds: 0 };
    const forTime: TimerConfig = { mode: "for-time", capSeconds: null, leadInSeconds: 0 };

    expect(nowPlaying(running(amrap, 1), 1_000)?.title).toBe("Los! · 1 Runde");
    // For Time without a time cap has no end: no progress bar.
    expect(nowPlaying(running(forTime, 3), 75_000)).toMatchObject({
      title: "Los! · 3 Runden",
      subtitle: "For Time",
      durationMs: null,
      positionMs: 75_000,
    });
  });

  it("does not go past the end of the last phase", () => {
    const amrap: TimerConfig = { mode: "amrap", seconds: 60, leadInSeconds: 0 };

    expect(nowPlaying(running(amrap), 61_000)).toMatchObject({
      durationMs: 60_000,
      positionMs: 60_000,
    });
  });
});
