// Global constants that the shared Vite config injects into every app.
import type { AppInfo } from "./index.d.ts";

declare global {
  /** The info of this app, from its package.json and pocket-apps.config.json. */
  const __POCKET_APP__: AppInfo;

  /** The info of all apps. Only the launcher gets this list. In apps, it is empty. */
  const __POCKET_APPS__: AppInfo[];
}

export {};
