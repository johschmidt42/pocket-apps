/** File actions for the start screen and the file bar. */
export type FileActions = {
  error: string | null;
  /** True if the browser can write directly into the file (Chrome, Edge). */
  directSave: boolean;
  createNew: () => Promise<void>;
  open: () => Promise<void>;
};

/** File actions when a file is loaded. */
export type LoadedFileActions = FileActions & {
  fileName: string;
  dirty: boolean;
  /** True if the app saves changes automatically. */
  autosaving: boolean;
  /** True after a migration until the first save. */
  pendingMigration: boolean;
  save: () => Promise<void>;
};
