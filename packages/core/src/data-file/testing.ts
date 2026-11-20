import {
  checkThenWrite,
  type DataFolder,
  type FileSnapshot,
  type FolderHost,
  type StorageKind,
} from "./folder.ts";

export type MemoryFolder = DataFolder & {
  /** All text files by path. */
  files: Map<string, FileSnapshot>;
  /** All files with bytes (`write` with a `Blob`) by path. */
  blobs: Map<string, Blob>;
  /** The access state that `queryAccess` returns. */
  access: PermissionState;
  /** The access state that `requestAccess` sets and returns. */
  accessAfterRequest: PermissionState;
  /** If set, `write` and `remove` fail with this error. */
  writeError: Error | null;
  /** Simulates a change on another device: a new text and a newer time. */
  changeElsewhere: (path: string, text: string) => void;
};

export type MemoryFolderHost = FolderHost & {
  /** The remembered folder, or `null`. */
  saved: MemoryFolder | null;
  /** The folder that the next `pick()` returns. `null` = the person cancels. */
  nextPick: MemoryFolder | null;
  /** The kinds of storage that the browser offers. Default: all. Firefox: only the cloud storages. */
  supportedKinds: StorageKind[];
  /** The kind of the last `pick()`, or `null`. */
  pickedKind: StorageKind | null;
};

/** An in-memory data folder. Use it in tests instead of mocks. */
export function createMemoryFolder(
  name = "Pocket Apps Daten",
  kind: StorageKind = "local",
): MemoryFolder {
  let clock = 1000;
  const folder: MemoryFolder = {
    name,
    kind,
    files: new Map(),
    blobs: new Map(),
    access: "granted",
    accessAfterRequest: "granted",
    writeError: null,
    queryAccess: () => Promise.resolve(folder.access),
    requestAccess: () => {
      folder.access = folder.accessAfterRequest;
      return Promise.resolve(folder.access);
    },
    read: (path) => Promise.resolve(folder.files.get(path) ?? null),
    lastModified: (path) => Promise.resolve(folder.files.get(path)?.lastModified ?? null),
    readBlob: (path) => {
      const text = folder.files.get(path)?.text;
      return Promise.resolve(
        folder.blobs.get(path) ?? (text === undefined ? null : new Blob([text])),
      );
    },
    write: (path, content) => {
      if (folder.writeError) return Promise.reject(folder.writeError);
      clock += 1;
      if (typeof content === "string")
        folder.files.set(path, { text: content, lastModified: clock });
      else folder.blobs.set(path, content);
      return Promise.resolve(clock);
    },
    writeIfUnchanged: (path, content, expected) =>
      checkThenWrite(folder.lastModified, folder.write)(path, content, expected),
    remove: (path) => {
      if (folder.writeError) return Promise.reject(folder.writeError);
      folder.files.delete(path);
      folder.blobs.delete(path);
      return Promise.resolve();
    },
    changeElsewhere: (path, text) => {
      clock += 1;
      folder.files.set(path, { text, lastModified: clock });
    },
  };
  return folder;
}

/**
 * An in-memory folder host. `saved` = a folder from an earlier visit. `kinds` = the kinds of
 * storage that the browser offers (default: all).
 */
export function createMemoryFolderHost(
  options: { saved?: MemoryFolder | null; kinds?: StorageKind[] } = {},
): MemoryFolderHost {
  const host: MemoryFolderHost = {
    saved: options.saved ?? null,
    nextPick: null,
    supportedKinds: options.kinds ?? ["local", "onedrive", "dropbox"],
    pickedKind: null,
    kinds: () => host.supportedKinds,
    loadSaved: () => Promise.resolve(host.saved),
    pick: (kind) => {
      host.pickedKind = kind;
      const picked = host.nextPick;
      if (picked) host.saved = picked;
      return Promise.resolve(picked);
    },
  };
  return host;
}
