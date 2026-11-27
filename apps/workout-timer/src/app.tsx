import { AppHeader } from "@pocket-apps/core/app-shell";
import { useEffect, useReducer, useRef, useState } from "react";
import { FinishedView } from "./finished-view.tsx";
import { createMedia, type Media } from "./media.ts";
import { nowPlaying } from "./now-playing.ts";
import { elapsedAt, runReducer } from "./run.ts";
import { RunningView } from "./running-view.tsx";
import { DEFAULT_SETTINGS, type Settings } from "./settings.ts";
import { SetupForm } from "./setup-form.tsx";
import { createSound, type Sound } from "./sound.ts";
import { buildTimeline, lastCue, positionAt, type TimerConfig } from "./timer.ts";
import { useWakeLock } from "./use-wake-lock.ts";

/** A clock in milliseconds. Only the differences count. */
export type Clock = () => number;

/** The clock of the browser. It does not jump when the user changes the time of the computer. */
const systemClock: Clock = () => performance.now();

/** How often the clock on the screen updates. Faster than a second, so no second is skipped. */
const TICK_MS = 100;

/** The media controls of the phone, with the app icon of the build. */
function browserMedia(): Media {
  return createMedia({
    artwork: new URL(`./icons/${__POCKET_APP__.name}-512.png`, window.location.href).href,
    album: __POCKET_APP__.title,
  });
}

/** Tests can give another clock, another sound and other media controls. */
export function App({
  clock = systemClock,
  sound,
  media,
}: {
  clock?: Clock;
  sound?: Sound;
  media?: Media;
}) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [run, dispatch] = useReducer(runReducer, { status: "setup" });
  const [now, setNow] = useState(clock);
  const [muted, setMuted] = useState(false);
  const [tones] = useState(() => sound ?? createSound());
  const [controls] = useState(() => media ?? browserMedia());
  // The elapsed time at the last tick. A tone plays when its time is between two ticks.
  const lastElapsed = useRef(0);

  useWakeLock(run.status === "running" || run.status === "paused");

  // The start of the current phase. The media controls change when it changes.
  const phaseStart =
    run.status === "running" || run.status === "paused"
      ? positionAt(buildTimeline(run.config), elapsedAt(run, now)).segment.startMs
      : null;

  // Sync with the media controls of the phone: the phase, the rounds, pause and the end.
  useEffect(() => {
    const state = nowPlaying(run, clock());
    if (state === null) controls.clear();
    else controls.show(state);
  }, [run, phaseStart, clock, controls]);

  // Remove the media controls when the app closes.
  useEffect(
    () => () => {
      controls.clear();
    },
    [controls],
  );

  // Sync with the clock: a timer that ticks while the workout runs.
  useEffect(() => {
    if (run.status !== "running") return;
    const timeline = buildTimeline(run.config);
    const timer = setInterval(() => {
      const time = clock();
      const elapsed = elapsedAt(run, time);
      const cue = lastCue(timeline, lastElapsed.current, elapsed);
      lastElapsed.current = elapsed;
      if (cue !== null && !muted) tones.play(cue);
      if (timeline.endMs !== null && elapsed >= timeline.endMs) {
        dispatch({ type: "finish", now: time });
      }
      setNow(time);
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [run, clock, muted, tones]);

  const pause = () => {
    dispatch({ type: "pause", now: clock() });
  };
  const resume = () => {
    const time = clock();
    setNow(time);
    dispatch({ type: "resume", now: time });
  };
  const finish = () => {
    dispatch({ type: "finish", now: clock() });
  };

  const start = (config: TimerConfig) => {
    tones.unlock();
    controls.start({ pause, play: resume, stop: finish });
    const time = clock();
    // From -1: without a lead-in, the work tone at 0 plays at the first tick.
    lastElapsed.current = -1;
    setNow(time);
    dispatch({ type: "start", config, now: time });
  };

  const content = () => {
    switch (run.status) {
      case "setup":
        return <SetupForm settings={settings} onChange={setSettings} onStart={start} />;
      case "running":
      case "paused":
        return (
          <RunningView
            config={run.config}
            elapsed={elapsedAt(run, now)}
            paused={run.status === "paused"}
            rounds={run.rounds}
            muted={muted}
            onPause={pause}
            onResume={resume}
            onFinish={finish}
            onCountRound={(change) => {
              dispatch({ type: "count-round", change });
            }}
            onToggleMute={() => {
              setMuted(!muted);
            }}
          />
        );
      case "finished":
        return (
          <FinishedView
            config={run.config}
            elapsed={run.elapsed}
            rounds={run.rounds}
            onAgain={() => {
              start(run.config);
            }}
            onNewTimer={() => {
              dispatch({ type: "reset" });
            }}
          />
        );
    }
  };

  return (
    <>
      <AppHeader app={__POCKET_APP__} />
      <main className="mx-auto flex max-w-md flex-col gap-4 p-4">{content()}</main>
    </>
  );
}
