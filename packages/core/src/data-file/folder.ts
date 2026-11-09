/** A file in the data folder: its text and the time of its last change (ms). */
export type FileSnapshot = { text: string; lastModified: number };

/** The data folder that the person picked. Paths use "/" between folder names. */
export type DataFolder = {
  readonly name: string;
  /** The access state without a dialog. */
  queryAccess: () => Promise<PermissionState>;
  /** Asks the person for access. Needs a click (user activation). */
  requestAccess: () => Promise<PermissionState>;
  /** The file, or `null` if it does not exist. */
  read: (path: string) => Promise<FileSnapshot | null>;
  /** The time of the last change of a file, or `null` if it does not exist. */
  lastModified: (path: string) => Promise<number | null>;
  /** Writes a file. Creates missing folders. Returns the new time of the last change. */
  write: (path: string, text: string) => Promise<number>;
};

/** Finds and remembers the data folder. Tests use a fake (see `testing.ts`). */
export type FolderHost = {
  /** True if the browser can open a folder (Chrome, Edge). */
  isSupported: () => boolean;
  /** The folder from an earlier visit, or `null`. */
  loadSaved: () => Promise<DataFolder | null>;
  /** Lets the person pick a folder and remembers it. `null` if the person cancels. */
  pick: () => Promise<DataFolder | null>;
};
