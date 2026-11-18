import { createContext, use } from "react";
import type { DataFolder } from "./folder.ts";

/** The open data folder and the version of the app that shows it. */
export type OpenFolder = { folder: DataFolder; appVersion: string };

/**
 * The open data folder, for shared files of all apps (for example `ai/ai.json`). Only modules
 * in packages/core read it. Apps use the data file API and the AI module. `null` without a
 * folder with access.
 */
export const DataFolderContext = createContext<OpenFolder | null>(null);

/** The open data folder, or `null`. */
export function useOpenFolder(): OpenFolder | null {
  return use(DataFolderContext);
}
