// The timeline of a workout timer: which phase runs at which time, and when a tone plays.
// All times are milliseconds since the start button, pauses not included.

export const MODES = ["for-time", "amrap", "emom", "tabata"] as const;
export type Mode = (typeof MODES)[number];

/**
 * The settings of one timer:
 * - `for-time`: the clock counts up until the user taps "Fertig", or until the time cap.
 * - `amrap`: the clock counts down from `seconds`.
 * - `emom`: a new round starts every `intervalSeconds`.
 * - `tabata`: rounds of work and rest. The last round has no rest.
 *
 * `leadInSeconds` is the time before the workout starts ("Gleich geht’s los"), with tones at
 * 3, 2 and 1. With 0, the workout starts at once.
 */
export type TimerConfig = { leadInSeconds: number } & ModeConfig;

/** The settings of the mode itself, without the lead-in. */
export type ModeConfig =
  | { mode: "for-time"; capSeconds: number | null }
  | { mode: "amrap"; seconds: number }
  | { mode: "emom"; intervalSeconds: number; rounds: number }
  | { mode: "tabata"; workSeconds: number; restSeconds: number; rounds: number };

export type Segment = {
  kind: "lead-in" | "work" | "rest";
  startMs: number;
  /** `null`: no end (For Time without a time cap). */
  durationMs: number | null;
  /** The round, from 1. `null` for the lead-in and for modes without fixed rounds. */
  round: number | null;
};

export type Timeline = {
  /**
   * The segments in their order, without gaps. The first segment is the lead-in. Without a
   * lead-in, it has the length 0 and the next segment also starts at 0.
   */
  segments: [Segment, ...Segment[]];
  /** The length of the lead-in. */
  leadInMs: number;
  /** The number of rounds of EMOM and Tabata. `null` for the other modes. */
  rounds: number | null;
  /** The end of the last segment. `null`: no end. */
  endMs: number | null;
};

export function buildTimeline(config: TimerConfig): Timeline {
  const leadInMs = config.leadInSeconds * 1000;
  const segments: Timeline["segments"] = [
    { kind: "lead-in", startMs: 0, durationMs: leadInMs, round: null },
  ];
  let startMs = leadInMs;
  const add = (kind: "work" | "rest", durationMs: number | null, round: number | null) => {
    segments.push({ kind, startMs, durationMs, round });
    if (durationMs !== null) startMs += durationMs;
  };

  switch (config.mode) {
    case "for-time":
      add("work", config.capSeconds === null ? null : config.capSeconds * 1000, null);
      return {
        segments,
        leadInMs,
        rounds: null,
        endMs: config.capSeconds === null ? null : startMs,
      };
    case "amrap":
      add("work", config.seconds * 1000, null);
      return { segments, leadInMs, rounds: null, endMs: startMs };
    case "emom":
      for (let round = 1; round <= config.rounds; round++) {
        add("work", config.intervalSeconds * 1000, round);
      }
      return { segments, leadInMs, rounds: config.rounds, endMs: startMs };
    case "tabata":
      for (let round = 1; round <= config.rounds; round++) {
        add("work", config.workSeconds * 1000, round);
        if (round < config.rounds) add("rest", config.restSeconds * 1000, round);
      }
      return { segments, leadInMs, rounds: config.rounds, endMs: startMs };
  }
}

export type Position = {
  segment: Segment;
  /** The time since the start of the segment. */
  inSegmentMs: number;
  /** The time until the end of the segment. `null`: the segment has no end. */
  leftMs: number | null;
  /** True when the timeline has an end and the time is at or after it. */
  done: boolean;
};

/** Where the timer is at `elapsedMs`. */
export function positionAt(timeline: Timeline, elapsedMs: number): Position {
  const { segments, endMs } = timeline;
  // The last segment that started. Each timeline starts with the lead-in at 0.
  let segment = segments[0];
  for (const candidate of segments) {
    if (candidate.startMs <= elapsedMs) segment = candidate;
  }
  if (endMs !== null && elapsedMs >= endMs) {
    return { segment, inSegmentMs: elapsedMs - segment.startMs, leftMs: 0, done: true };
  }
  const inSegmentMs = Math.max(0, elapsedMs - segment.startMs);
  const leftMs = segment.durationMs === null ? null : segment.durationMs - inSegmentMs;
  return { segment, inSegmentMs, leftMs, done: false };
}

/** The time of the workout itself: without the lead-in, and not after the end. */
export function workoutMs(timeline: Timeline, elapsedMs: number): number {
  const end = timeline.endMs ?? Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(elapsedMs, end) - timeline.leadInMs);
}

/** True for the modes in which the user counts the rounds: For Time and AMRAP. */
export function countsRounds(config: TimerConfig): boolean {
  return config.mode === "for-time" || config.mode === "amrap";
}

/**
 * The rounds of EMOM or Tabata that are complete at `elapsedMs`. A Tabata round is complete
 * after its work: the rest does not count. 0 for the other modes.
 */
export function completedRounds(timeline: Timeline, elapsedMs: number): number {
  const { segment, done } = positionAt(timeline, elapsedMs);
  if (done) return timeline.rounds ?? 0;
  if (segment.round === null) return 0;
  return segment.kind === "rest" ? segment.round : segment.round - 1;
}

/**
 * The tones:
 * - `count`: short, 3, 2 and 1 seconds before the end of a segment.
 * - `work`: long and high, at the start of a work segment.
 * - `rest`: long and low, at the start of a rest segment.
 * - `end`: very long, at the end of the timeline.
 */
export type Cue = "count" | "work" | "rest" | "end";

type TimedCue = { atMs: number; cue: Cue };

function cueTimes(timeline: Timeline): TimedCue[] {
  const cues: TimedCue[] = [];
  for (const segment of timeline.segments) {
    if (segment.kind !== "lead-in") cues.push({ atMs: segment.startMs, cue: segment.kind });
    if (segment.durationMs === null) continue;
    const endMs = segment.startMs + segment.durationMs;
    for (const secondsLeft of [3, 2, 1]) {
      const atMs = endMs - secondsLeft * 1000;
      if (atMs > segment.startMs) cues.push({ atMs, cue: "count" });
    }
  }
  if (timeline.endMs !== null) cues.push({ atMs: timeline.endMs, cue: "end" });
  return cues;
}

/**
 * The last tone after `fromMs` and at or before `toMs`, or `null`. The timer asks for each tick.
 * If a tick comes late (for example in a background tab), only the newest tone plays.
 * Without a lead-in, the work tone is at 0: ask from -1 at the start, so that it plays.
 */
export function lastCue(timeline: Timeline, fromMs: number, toMs: number): Cue | null {
  let found: Cue | null = null;
  for (const { atMs, cue } of cueTimes(timeline)) {
    if (atMs > fromMs && atMs <= toMs) found = cue;
  }
  return found;
}

/** A time as "m:ss", or "h:mm:ss" from one hour. Example: 452 → "7:32". */
export function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours === 0) return `${String(minutes)}:${ss}`;
  return `${String(hours)}:${String(minutes).padStart(2, "0")}:${ss}`;
}

/** The short German name of a timer. Example: "Tabata 8 × 20 s / 10 s". */
export function describeTimer(config: TimerConfig): string {
  switch (config.mode) {
    case "for-time":
      return config.capSeconds === null
        ? "For Time"
        : `For Time · Time Cap ${formatClock(config.capSeconds)}`;
    case "amrap":
      return `AMRAP ${formatClock(config.seconds)}`;
    case "emom":
      return `EMOM ${String(config.rounds)} × ${formatClock(config.intervalSeconds)}`;
    case "tabata":
      return `Tabata ${String(config.rounds)} × ${String(config.workSeconds)} s / ${String(config.restSeconds)} s`;
  }
}
