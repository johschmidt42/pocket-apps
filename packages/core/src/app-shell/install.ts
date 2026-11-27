// Installs the app as a Progressive Web App (PWA). The build gives each app a web app manifest
// (see packages/vite-config/pwa.js). When the browser can install the page, Chrome and Edge fire
// the event "beforeinstallprompt". The app keeps the event and shows its own install button. A
// click on it opens the install dialog of the browser. Firefox and Safari do not fire the event:
// there the button does not show. See "Apps as installable PWAs" in docs/decisions.md.
import { useSyncExternalStore } from "react";

/** The event "beforeinstallprompt". TypeScript does not know it: it is not a web standard. */
type InstallPrompt = Event & { prompt: () => Promise<unknown> };

function isInstallPrompt(event: Event): event is InstallPrompt {
  return "prompt" in event && typeof event.prompt === "function";
}

/** The event of the browser, kept for the install button. */
let deferredPrompt: InstallPrompt | null = null;
let listening = false;
const listeners = new Set<() => void>();

function setDeferredPrompt(next: InstallPrompt | null): void {
  deferredPrompt = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Starts to listen for the install events of the browser. `mountApp` calls it before the first
 * render, because the browser can fire the event before the header shows. A second call does
 * nothing.
 */
export function listenForInstall(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    if (!isInstallPrompt(event)) return;
    // Without this, Chrome can show its own install banner in addition to the button.
    event.preventDefault();
    setDeferredPrompt(event);
  });
  window.addEventListener("appinstalled", () => {
    setDeferredPrompt(null);
  });
}

/**
 * The function that opens the install dialog of the browser, or `null` if the browser cannot
 * install the page now. The browser allows the dialog once per event. If the user closes the
 * dialog, the browser can fire a new event later.
 */
export function useInstall(): (() => Promise<void>) | null {
  const prompt = useSyncExternalStore(subscribe, () => deferredPrompt);
  if (prompt === null) return null;
  return async () => {
    setDeferredPrompt(null);
    try {
      await prompt.prompt();
    } catch {
      // The browser did not open the dialog. The user can install the app from its menu.
    }
  };
}

/**
 * True if the page runs as an installed app in its own window, without the address bar of the
 * browser. Then it has no link to the launcher: each installed app stands alone.
 */
export function isInstalledApp(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches
  );
}
