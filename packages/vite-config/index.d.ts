import type { UserConfig } from "vite";

/** The link from an app back to the launcher. */
export type BackLink = { href: string; label: string };

/** The info of one app. It comes from the app's package.json and pocket-apps.config.json. */
export type AppInfo = {
  /** Package name and file name, for example "einkaufsliste". */
  name: string;
  /** German display name (`pocketApp.title`). */
  title: string;
  /** App version as "major.minor", for example "1.2". `package.json` has "1.2.0". */
  version: string;
  /** German short description (`description`). */
  description: string;
  /** One emoji as the app icon (`pocketApp.emoji`). */
  emoji: string;
  /** True if the app has a data file (`pocketApp.stateful`). */
  stateful: boolean;
  /** True if the app needs the internet, for example for an external API (`pocketApp.network`). */
  network: boolean;
  /** The link back to the launcher, or `null` if it is off. */
  backLink: BackLink | null;
};

/** The repository root folder. */
export declare const ROOT_DIR: string;

/** Reads and validates pocket-apps.config.json in the root folder. */
export declare function readRepoConfig(): { backLink: BackLink & { enabled: boolean } };

/** Reads the info of one app from its package.json and the repo config. */
export declare function readAppInfo(appDir: string): AppInfo;

/** Reads the info of all apps in apps/, sorted by title. */
export declare function listApps(): AppInfo[];

/** Creates the Vite config for one app or the launcher. Pass `import.meta.url`. */
export declare function createAppConfig(
  configUrl: string,
  options?: { withAppList?: boolean },
): UserConfig;
