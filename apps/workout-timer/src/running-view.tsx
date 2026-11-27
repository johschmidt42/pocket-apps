import { Button } from "@pocket-apps/ui/components/button";
import { Check, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import type { ReactNode } from "react";
import { ProgressRing, type RingPhase } from "./progress-ring.tsx";
import { RoundCounter } from "./round-counter.tsx";
import { MAX_DOTS, RoundDots } from "./round-dots.tsx";
import {
  buildTimeline,
  completedRounds,
  countsRounds,
  describeTimer,
  formatClock,
  type Position,
  positionAt,
  type Segment,
  type TimerConfig,
} from "./timer.ts";

/** A light tint of the phase color behind the ring. */
const TINTS: Record<RingPhase, string> = {
  "lead-in":
    "flex flex-col gap-4 rounded-[2rem] bg-chart-1/10 px-4 py-6 transition-colors duration-500",
  work: "flex flex-col gap-4 rounded-[2rem] bg-chart-3/10 px-4 py-6 transition-colors duration-500",
  rest: "flex flex-col gap-4 rounded-[2rem] bg-chart-2/10 px-4 py-6 transition-colors duration-500",
  paused: "flex flex-col gap-4 rounded-[2rem] bg-muted px-4 py-6 transition-colors duration-500",
};

const DOTS: Record<RingPhase, string> = {
  "lead-in": "size-2.5 rounded-full bg-chart-1",
  work: "size-2.5 rounded-full bg-chart-3",
  rest: "size-2.5 rounded-full bg-chart-2",
  paused: "size-2.5 rounded-full bg-muted-foreground",
};

/** The timer while it runs or pauses: a ring with the clock, the rounds and the controls. */
export function RunningView({
  config,
  elapsed,
  paused,
  rounds,
  muted,
  onPause,
  onResume,
  onFinish,
  onCountRound,
  onToggleMute,
}: {
  config: TimerConfig;
  /** The time since the start, without pauses, in milliseconds. */
  elapsed: number;
  paused: boolean;
  rounds: number;
  muted: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCountRound: (change: 1 | -1) => void;
  onToggleMute: () => void;
}) {
  const timeline = buildTimeline(config);
  const position = positionAt(timeline, elapsed);
  const { segment } = position;
  const phase: RingPhase = paused ? "paused" : segment.kind;
  const clock = clockText(config, position);
  // For Time ends with "Fertig": it gets the large button in the middle.
  const forTime = config.mode === "for-time";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-center text-sm font-medium text-muted-foreground">
        {describeTimer(config)}
      </p>
      <section aria-label="Timer" className={TINTS[phase]}>
        <ProgressRing fraction={ringFraction(position)} phase={phase}>
          <div aria-live="polite">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
              <span aria-hidden="true" className={DOTS[phase]} />
              {paused ? "Pausiert" : phaseLabel(config, segment.kind)}
            </h2>
          </div>
          {/* The clock pulses during a pause. */}
          <div className={paused ? "animate-pulse" : ""}>
            <p role="timer" className={clockClass(segment, clock)}>
              {clock}
            </p>
          </div>
          {segment.round !== null && timeline.rounds !== null && (
            <p className="text-sm text-muted-foreground">
              Runde {segment.round} von {timeline.rounds}
            </p>
          )}
        </ProgressRing>
        {timeline.rounds !== null && timeline.rounds <= MAX_DOTS && (
          <RoundDots
            rounds={timeline.rounds}
            completed={completedRounds(timeline, elapsed)}
            current={segment.kind === "work" ? segment.round : null}
            phase={phase}
          />
        )}
      </section>

      {countsRounds(config) && <RoundCounter rounds={rounds} onCountRound={onCountRound} />}

      <div className="flex items-start justify-center gap-6">
        {forTime ? (
          <PauseButton paused={paused} large={false} onPause={onPause} onResume={onResume} />
        ) : (
          <ControlButton label="Beenden" large={false} onClick={onFinish}>
            <Square aria-hidden="true" className="fill-current" />
          </ControlButton>
        )}
        {forTime ? (
          <ControlButton label="Fertig" large onClick={onFinish}>
            <Check aria-hidden="true" className="size-9" />
          </ControlButton>
        ) : (
          <PauseButton paused={paused} large onPause={onPause} onResume={onResume} />
        )}
        <ControlButton label={muted ? "Ton an" : "Ton aus"} large={false} onClick={onToggleMute}>
          {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </ControlButton>
      </div>
    </div>
  );
}

function PauseButton({
  paused,
  large,
  onPause,
  onResume,
}: {
  paused: boolean;
  large: boolean;
  onPause: () => void;
  onResume: () => void;
}) {
  const icon = large ? "size-8 fill-current" : "fill-current";
  return paused ? (
    <ControlButton label="Weiter" large={large} onClick={onResume}>
      <Play aria-hidden="true" className={icon} />
    </ControlButton>
  ) : (
    <ControlButton label="Pause" large={large} onClick={onPause}>
      <Pause aria-hidden="true" className={icon} />
    </ControlButton>
  );
}

/** A round button with its name below. The large one is the main action. */
function ControlButton({
  label,
  large,
  onClick,
  children,
}: {
  label: string;
  large: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* The same height for all buttons: the names below stay on one line. */}
      <div className="flex h-20 items-center">
        <Button
          type="button"
          variant={large ? "default" : "secondary"}
          className={large ? "size-20 rounded-full shadow-lg" : "size-14 rounded-full"}
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </div>
      <span aria-hidden="true" className="text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function phaseLabel(config: TimerConfig, kind: Segment["kind"]): string {
  switch (kind) {
    case "lead-in":
      return "Gleich geht’s los";
    case "rest":
      return "Pause";
    case "work":
      return config.mode === "tabata" ? "Arbeit" : "Los!";
  }
}

/** The lead-in shows the seconds left. For Time counts up, the other modes count down. */
function clockText(config: TimerConfig, position: Position): string {
  const { segment, inSegmentMs, leftMs } = position;
  if (segment.kind === "lead-in") return String(Math.ceil((leftMs ?? 0) / 1000));
  if (config.mode === "for-time" || leftMs === null) {
    return formatClock(Math.floor(inSegmentMs / 1000));
  }
  return formatClock(Math.ceil(leftMs / 1000));
}

/** The lead-in number is huge. From one hour, "h:mm:ss" needs a smaller font for 320 px. */
function clockClass(segment: Segment, clock: string): string {
  if (segment.kind === "lead-in") return "text-8xl font-bold tracking-tight tabular-nums";
  if (clock.length > 5) return "text-4xl font-bold tracking-tight tabular-nums sm:text-5xl";
  return "text-6xl font-bold tracking-tight tabular-nums sm:text-7xl";
}

/**
 * How full the ring is. For Time without a time cap has no end: the ring then goes round once
 * per minute, like the second hand of a clock.
 */
function ringFraction(position: Position): number {
  const { segment, inSegmentMs } = position;
  if (position.done) return 1;
  if (segment.durationMs === null) return (inSegmentMs % 60_000) / 60_000;
  return inSegmentMs / segment.durationMs;
}
