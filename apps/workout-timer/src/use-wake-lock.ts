import { useEffect } from "react";

/**
 * Keeps the screen on while `active` is true (Screen Wake Lock API). The browser releases the
 * lock when the tab is hidden. Thus the hook asks again when the tab is visible again.
 * Without the API (for example in older browsers), the screen can turn off.
 */
export function useWakeLock(active: boolean): void {
  // Sync with an external system: the wake lock of the browser.
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;

    const request = () => {
      navigator.wakeLock.request("screen").then(
        (sentinel) => {
          if (stopped) void sentinel.release();
          else lock = sentinel;
        },
        () => {
          // The browser can refuse, for example with a low battery. The timer still works.
        },
      );
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (lock !== null) void lock.release();
    };
  }, [active]);
}
