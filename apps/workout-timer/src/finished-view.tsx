import { Button } from "@pocket-apps/ui/components/button";
import { Card, CardContent } from "@pocket-apps/ui/components/card";
import { Flag, RotateCcw, Settings2, Timer, Trophy } from "lucide-react";
import {
  buildTimeline,
  completedRounds,
  countsRounds,
  describeTimer,
  formatClock,
  positionAt,
  type TimerConfig,
  workoutMs,
} from "./timer.ts";

/** The result after the end: the time and the rounds. */
export function FinishedView({
  config,
  elapsed,
  rounds,
  onAgain,
  onNewTimer,
}: {
  config: TimerConfig;
  /** The time since the start, without pauses, in milliseconds. */
  elapsed: number;
  /** The rounds that the user counted (For Time, AMRAP). */
  rounds: number;
  onAgain: () => void;
  onNewTimer: () => void;
}) {
  const timeline = buildTimeline(config);
  const position = positionAt(timeline, elapsed);
  const seconds = Math.floor(workoutMs(timeline, elapsed) / 1000);
  const { title, Icon, badge } = outcome(config, position.done);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <div className={badge}>
            <Icon aria-hidden="true" className="size-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{describeTimer(config)}</p>
          <dl className="mt-2 grid w-full grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 rounded-2xl bg-muted p-4">
              <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Zeit
              </dt>
              <dd className="text-3xl font-bold tracking-tight tabular-nums">
                {formatClock(seconds)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-muted p-4">
              <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Runden
              </dt>
              <dd className="text-3xl font-bold tracking-tight tabular-nums">
                {countsRounds(config)
                  ? rounds
                  : `${String(completedRounds(timeline, elapsed))} von ${String(timeline.rounds ?? 0)}`}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" className="h-12" onClick={onAgain}>
          <RotateCcw aria-hidden="true" />
          Nochmal
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={onNewTimer}>
          <Settings2 aria-hidden="true" />
          Neuer Timer
        </Button>
      </div>
    </div>
  );
}

/**
 * For Time ends with "Fertig" (done) or at the time cap. The other modes end at the end of the
 * timeline (done) or with "Beenden" before it.
 */
function outcome(config: TimerConfig, reachedEnd: boolean) {
  const done = {
    title: "Geschafft!",
    Icon: Trophy,
    badge: "mb-2 flex size-16 items-center justify-center rounded-full bg-chart-3/15",
  };
  if (config.mode === "for-time") {
    return reachedEnd
      ? {
          title: "Time Cap",
          Icon: Timer,
          badge: "mb-2 flex size-16 items-center justify-center rounded-full bg-chart-2/15",
        }
      : done;
  }
  return reachedEnd
    ? done
    : {
        title: "Beendet",
        Icon: Flag,
        badge: "mb-2 flex size-16 items-center justify-center rounded-full bg-muted",
      };
}
