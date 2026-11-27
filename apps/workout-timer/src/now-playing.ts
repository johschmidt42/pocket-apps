// What the media controls of the phone show for a run of the timer. Pure logic: media.ts gives it
// to the browser.

import { elapsedAt, type Run } from "./run.ts";
import { buildTimeline, countsRounds, describeTimer, phaseLabel, positionAt } from "./timer.ts";

export type NowPlaying = {
  /** The phase, for example "Arbeit · Runde 3 von 8". */
  title: string;
  /** The timer, for example "Tabata 8 × 20 s / 10 s". */
  subtitle: string;
  /** False during a pause. */
  playing: boolean;
  /** The length of the phase. `null`: the phase has no end (For Time without a time cap). */
  durationMs: number | null;
  /** The time since the start of the phase. */
  positionMs: number;
};

/** The media controls for a run at the clock time `now`. `null`: no timer runs or pauses. */
export function nowPlaying(run: Run, now: number): NowPlaying | null {
  if (run.status !== "running" && run.status !== "paused") return null;
  const { config } = run;
  const timeline = buildTimeline(config);
  const { segment, inSegmentMs } = positionAt(timeline, elapsedAt(run, now));
  const parts = [phaseLabel(config, segment.kind)];
  if (segment.round !== null && timeline.rounds !== null) {
    parts.push(`Runde ${String(segment.round)} von ${String(timeline.rounds)}`);
  } else if (countsRounds(config) && segment.kind === "work") {
    parts.push(run.rounds === 1 ? "1 Runde" : `${String(run.rounds)} Runden`);
  }
  return {
    title: parts.join(" · "),
    subtitle: describeTimer(config),
    playing: run.status === "running",
    durationMs: segment.durationMs,
    positionMs:
      segment.durationMs === null ? inSegmentMs : Math.min(inSegmentMs, segment.durationMs),
  };
}
