/** A file in the data folder: its text and the time of its last change (ms). */
export type FileSnapshot = { text: string; lastModified: number };

/** Where the data lives: a folder on this computer, or the app folder in a cloud storage. */
export type StorageKind = "local" | CloudKind;

/**
 * The cloud storages, in the order of the choice: the recommended one first. Each has the app
 * folder `/Apps/Pocket Apps`.
 */
export const CLOUD_KINDS = ["dropbox", "onedrive"] as const;
export type CloudKind = (typeof CLOUD_KINDS)[number];

/** The result of a write on a condition: the new time, or `"changed"` if the file changed elsewhere. */
export type WriteResult = number | "changed";

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
  /**
   * Writes a text file only if nobody changed it since `expected`: the time of its last change
   * that the app knows, or `null` for a file that did not exist. Returns the new time, or
   * `"changed"` if the file changed elsewhere. The store saves the data file with it.
   */
  writeIfUnchanged: (
    path: string,
    content: string,
    expected: number | null,
  ) => Promise<WriteResult>;
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

/**
 * `writeIfUnchanged()` for a folder that cannot write on a condition: it gets the time of the
 * last change first and writes only if the time is `expected`.
 */
export function checkThenWrite(
  lastModified: DataFolder["lastModified"],
  write: (path: string, content: string) => Promise<WriteResult>,
): DataFolder["writeIfUnchanged"] {
  return async (path, content, expected) =>
    (await lastModified(path)) === expected ? write(path, content) : "changed";
}
