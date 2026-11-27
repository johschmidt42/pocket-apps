import { useEffect } from "react";

/**
 * Lets the browser ask ("Seite verlassen?") before a reload, before the tab closes and before a
 * link leaves the page, while `active` is true. The browser shows its own question.
 */
export function useLeaveWarning(active: boolean): void {
  // Sync with a browser event.
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active]);
}
