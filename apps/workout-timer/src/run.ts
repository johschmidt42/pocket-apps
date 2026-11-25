// The state of one run of the timer. Times come from the clock of the app (milliseconds).

import { buildTimeline, type TimerConfig } from "./timer.ts";

export type Run =
  | { status: "setup" }
  | {
      status: "running";
      config: TimerConfig;
      /** The clock time of the start, or of the last "Weiter". */
      startedAt: number;
      /** The time that ran before `startedAt`. */
      elapsedBefore: number;
      /** The rounds that the user counted (For Time, AMRAP). */
      rounds: number;
    }
  | { status: "paused"; config: TimerConfig; elapsed: number; rounds: number }
  | { status: "finished"; config: TimerConfig; elapsed: number; rounds: number };

export type RunAction =
  | { type: "start"; config: TimerConfig; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "finish"; now: number }
  | { type: "count-round"; change: 1 | -1 }
  | { type: "reset" };

/** The time since the start, without the pauses. */
export function elapsedAt(run: Run, now: number): number {
  switch (run.status) {
    case "setup":
      return 0;
    case "running":
      return run.elapsedBefore + Math.max(0, now - run.startedAt);
    case "paused":
    case "finished":
      return run.elapsed;
  }
}

export function runReducer(run: Run, action: RunAction): Run {
  switch (action.type) {
    case "start":
      return {
        status: "running",
        config: action.config,
        startedAt: action.now,
        elapsedBefore: 0,
        rounds: 0,
      };
    case "pause":
      if (run.status !== "running") return run;
      return {
        status: "paused",
        config: run.config,
        elapsed: elapsedAt(run, action.now),
        rounds: run.rounds,
      };
    case "resume":
      if (run.status !== "paused") return run;
      return {
        status: "running",
        config: run.config,
        startedAt: action.now,
        elapsedBefore: run.elapsed,
        rounds: run.rounds,
      };
    case "finish": {
      if (run.status !== "running" && run.status !== "paused") return run;
      const { endMs } = buildTimeline(run.config);
      const elapsed = elapsedAt(run, action.now);
      return {
        status: "finished",
        config: run.config,
        elapsed: endMs === null ? elapsed : Math.min(elapsed, endMs),
        rounds: run.rounds,
      };
    }
    case "count-round":
      if (run.status !== "running" && run.status !== "paused") return run;
      return { ...run, rounds: Math.max(0, run.rounds + action.change) };
    case "reset":
      return { status: "setup" };
  }
}
