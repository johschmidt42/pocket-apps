// Light mode is the default. The class "dark" on <html> switches to dark mode.
// The browser remembers the choice in localStorage. This is only a convenience:
// under file:// some browsers do not keep localStorage. Then the app starts in light mode.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pocket-apps-theme";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The saved theme. Light if nothing is saved or the storage is not available. */
export function readSavedTheme(): Theme {
  try {
    return storage()?.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Saves the theme. Does nothing if the storage is not available. */
export function saveTheme(theme: Theme): void {
  try {
    storage()?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The theme is a convenience. Without storage, the app starts in light mode next time.
  }
}

/** The theme that the page shows now. */
export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * The page color of each theme (`--background` in globals.css). An installed app on a phone gives
 * the status bar this color (the meta tag "theme-color"). The same values are in
 * packages/vite-config/pwa.js.
 */
export const THEME_COLORS: Record<Theme, string> = { light: "#ffffff", dark: "#0c0a09" };

/** Shows the theme on the page. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  // The build adds the meta tag. The dev server and the unit tests do not have it.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

/** Applies the saved theme. Call it in main.tsx before the first render. */
export function initTheme(): void {
  applyTheme(readSavedTheme());
}
