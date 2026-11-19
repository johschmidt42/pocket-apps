/** A file in the data folder: its text and the time of its last change (ms). */
export type FileSnapshot = { text: string; lastModified: number };

/** Where the data lives: a folder on this computer, or the app folder in OneDrive. */
export type StorageKind = "local" | "onedrive";

/** The data folder that the person picked. Paths use "/" between folder names. */
export type DataFolder = {
  readonly name: string;
  readonly kind: StorageKind;
  /** The access state without a dialog. */
  queryAccess: () => Promise<PermissionState>;
  /**
   * Asks the person for access. Needs a click (user activation).
   * For OneDrive, the page goes to the Microsoft login and the promise does not end.
   */
  requestAccess: () => Promise<PermissionState>;
  /** The file, or `null` if it does not exist. */
  read: (path: string) => Promise<FileSnapshot | null>;
  /** The time of the last change of a file, or `null` if it does not exist. */
  lastModified: (path: string) => Promise<number | null>;
  /** The content of a file as bytes, for example an image. `null` if it does not exist. */
  readBlob: (path: string) => Promise<Blob | null>;
  /**
   * Writes a file: a text or bytes (a `Blob`). Creates missing folders.
   * Returns the new time of the last change.
   */
  write: (path: string, content: string | Blob) => Promise<number>;
  /** Deletes a file. Does nothing if the file does not exist. */
  remove: (path: string) => Promise<void>;
};

/** Finds and remembers the data folder. Tests use a fake (see `testing.ts`). */
export type FolderHost = {
  /** The kinds of storage that this browser can use. "local" needs Chrome or Edge on a computer. */
  kinds: () => readonly StorageKind[];
  /** The folder from an earlier visit, or `null`. */
  loadSaved: () => Promise<DataFolder | null>;
  /**
   * Lets the person pick a folder of this kind and remembers it. `null` if the person cancels.
   * For OneDrive, the page goes to the Microsoft login and the promise does not end.
   */
  pick: (kind: StorageKind) => Promise<DataFolder | null>;
};
