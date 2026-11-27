// Protects a running timer from the back gesture. While a timer runs, the app keeps one extra
// entry in the browser history (same address). The back gesture or the back button removes only
// this entry: the app stays open and asks first. A second "back" leaves the app.
// See "Ask before the back gesture ends a timer (workout-timer)" in docs/decisions.md.

import { useEffect, useEffectEvent } from "react";

/** The `history.state` of the extra entry. */
const GUARD = { workoutTimerGuard: true };

/** True if the current entry of the browser history is the extra entry. */
function isGuardEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && "workoutTimerGuard" in state;
}

// True while the app itself goes back over the extra entry: the next `popstate` is not the user.
// Module state: the app has one timer, and the browser has one history.
let selfBack = false;

/** Adds the extra entry. Call it when a timer starts, and when the user keeps the timer. */
export function armBackGuard(): void {
  // While the app goes back, the extra entry is still the current entry. The `popstate` handler
  // adds a new one when it sees a running timer.
  if (selfBack || isGuardEntry()) return;
  window.history.pushState(GUARD, "");
}

/** Removes the extra entry again. Call it when the timer ends in the app. */
export function disarmBackGuard(): void {
  // A second call before the browser went back would go back one more step and leave the app.
  if (selfBack || !isGuardEntry()) return;
  selfBack = true;
  window.history.back();
}

/**
 * Connects the extra entry to the timer. `active`: a timer runs or pauses. `onBack`: the user
 * went back from the extra entry while a timer runs.
 */
export function useBackGuard(active: boolean, onBack: () => void): void {
  const handlePopState = useEffectEvent(() => {
    if (selfBack) {
      selfBack = false;
      // "Nochmal" right after the end: the new timer needs its entry.
      if (active) armBackGuard();
      return;
    }
    if (isGuardEntry()) {
      // The forward button leads to an old extra entry without a timer.
      if (!active) disarmBackGuard();
      return;
    }
    if (active) onBack();
  });

  // Sync with the browser history.
  useEffect(() => {
    // A reload keeps `history.state`: an extra entry from before the reload has no timer.
    if (isGuardEntry()) disarmBackGuard();
    const listener = () => {
      handlePopState();
    };
    window.addEventListener("popstate", listener);
    return () => {
      window.removeEventListener("popstate", listener);
    };
  }, []);
}
