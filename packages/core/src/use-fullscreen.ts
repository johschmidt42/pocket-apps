import { useEffect, useState } from "react";

/** What `useFullscreen()` gives. */
export type Fullscreen = {
  /**
   * False if the browser has no Fullscreen API: in an iframe without permission, and on an iPhone.
   * Then show no button for the full screen.
   */
  possible: boolean;
  /** True while the page is in full screen. Then cover the page with the picture (`fixed inset-0`). */
  active: boolean;
  enter: () => void;
  exit: () => void;
};

/**
 * The full screen for an app that shows a picture, for example a game or an animation.
 *
 * The whole page goes into full screen, not only the picture. The tooltips and dialogs of
 * `packages/ui` show in an element at the end of `<body>`. With only the picture in full screen,
 * the browser does not show them. Thus the app covers the page with its picture while `active`
 * is true, for example with the classes `fixed inset-0 z-40`.
 *
 * The user can also leave the full screen with the Esc key. `active` follows that too.
 * If the browser refuses, nothing changes.
 */
export function useFullscreen(): Fullscreen {
  const [possible] = useState(() => document.fullscreenEnabled);
  const [active, setActive] = useState(false);

  // The browser owns the full screen. Only this event tells when it starts and ends.
  useEffect(() => {
    function onFullscreenChange(): void {
      setActive(document.fullscreenElement !== null);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  return {
    possible,
    active,
    enter() {
      document.documentElement.requestFullscreen().catch(() => {
        // The browser refused the full screen. The picture stays in the page.
      });
    },
    exit() {
      document.exitFullscreen().catch(() => {
        // The full screen ended already.
      });
    },
  };
}
