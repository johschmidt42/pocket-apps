import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { z } from "zod";

/** What the hook keeps in `history.state` of each entry of the browser history. */
const entrySchema = z.object({
  /** true: the entry of a sub-page. The entry before it is the main page of the app. */
  subPage: z.boolean(),
  /** The scroll position of the page when the user left this entry. */
  scrollTop: z.number(),
});
type Entry = z.infer<typeof entrySchema>;

export type SubPage = {
  /** The open sub-page, for example the ID of a workout. `null`: the main page. */
  page: string | null;
  /**
   * Shows a sub-page from its top. From the main page, this adds an entry to the browser history.
   * From a sub-page, the new sub-page replaces the open one.
   */
  open: (page: string) => void;
  /** Shows the main page, and goes back in the browser history like the back button of the browser. */
  back: () => void;
};

/**
 * One sub-page of an app (for example the detail of a workout), in the browser history.
 * The hash of the URL holds the sub-page: `trainingsbuch.html#fran`. Thus the back button of the
 * browser closes the sub-page, and a reload shows the same sub-page again. When the main page
 * shows again, it scrolls to the place where the user left it. Use the hook once per app: it
 * owns the hash and `history.state`.
 */
export function useSubPage(): SubPage {
  const [page, setPage] = useState(() => pageFromHash(window.location.hash));
  // The scroll position of the main page when the last sub-page opened.
  const mainScroll = useRef(0);

  useEffect(() => {
    // The tab started on a sub-page without an entry of the app before it (a bookmark or a link).
    // An entry of the main page goes before it. Then "back" shows the main page, not another site.
    if (pageFromHash(window.location.hash) !== null && readEntry()?.subPage !== true) {
      const main: Entry = { subPage: false, scrollTop: 0 };
      const sub: Entry = { subPage: true, scrollTop: 0 };
      const hash = window.location.hash;
      window.history.replaceState(main, "", window.location.pathname + window.location.search);
      window.history.pushState(sub, "", hash);
    }
    // The hook sets the scroll position itself, after the page shows its content.
    window.history.scrollRestoration = "manual";
    function onPopState(): void {
      show(pageFromHash(window.location.hash), readEntry()?.scrollTop ?? 0);
    }
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.history.scrollRestoration = "auto";
    };
  }, []);

  /** Shows the page at once, then scrolls. Without `flushSync`, the old page would scroll. */
  function show(next: string | null, scrollTop: number): void {
    flushSync(() => {
      setPage(next);
    });
    document.documentElement.scrollTop = scrollTop;
  }

  function open(next: string): void {
    const hash = `#${encodeURIComponent(next)}`;
    if (readEntry()?.subPage === true) {
      // Only one level: the new sub-page replaces the open one. "Back" still shows the main page.
      window.history.replaceState(readEntry(), "", hash);
    } else {
      mainScroll.current = document.documentElement.scrollTop;
      const main: Entry = { subPage: false, scrollTop: mainScroll.current };
      const sub: Entry = { subPage: true, scrollTop: 0 };
      window.history.replaceState(main, "");
      window.history.pushState(sub, "", hash);
    }
    show(next, 0);
  }

  function back(): void {
    // The main page shows at once: a second click cannot go back one more step.
    show(null, mainScroll.current);
    // The "popstate" event then shows the page of the entry before, at its scroll position.
    window.history.back();
  }

  return { page, open, back };
}

function readEntry(): Entry | null {
  const entry = entrySchema.safeParse(window.history.state);
  return entry.success ? entry.data : null;
}

/** "#fran" → "fran". An empty or broken hash (for example "#%E0") is the main page. */
function pageFromHash(hash: string): string | null {
  const text = hash.replace(/^#/, "");
  if (text === "") return null;
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}
