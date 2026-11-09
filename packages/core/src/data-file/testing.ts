import type { DataFolder, FileSnapshot, FolderHost } from "./folder.ts";

export type MemoryFolder = DataFolder & {
  /** All files by path. */
  files: Map<string, FileSnapshot>;
  /** The access state that `queryAccess` returns. */
  access: PermissionState;
  /** The access state that `requestAccess` sets and returns. */
  accessAfterRequest: PermissionState;
  /** If set, `write` fails with this error. */
  writeError: Error | null;
  /** Simulates a change on another device: a new text and a newer time. */
  changeElsewhere: (path: string, text: string) => void;
};

export type MemoryFolderHost = FolderHost & {
  /** The remembered folder, or `null`. */
  saved: MemoryFolder | null;
  /** The folder that the next `pick()` returns. `null` = the person cancels. */
  nextPick: MemoryFolder | null;
  /** False = a browser without folder access. */
  supported: boolean;
};

/** An in-memory data folder. Use it in tests instead of mocks. */
export function createMemoryFolder(name = "Pocket Apps Daten"): MemoryFolder {
  let clock = 1000;
  const folder: MemoryFolder = {
    name,
    files: new Map(),
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
    write: (path, text) => {
      if (folder.writeError) return Promise.reject(folder.writeError);
      clock += 1;
      folder.files.set(path, { text, lastModified: clock });
      return Promise.resolve(clock);
    },
    changeElsewhere: (path, text) => {
      clock += 1;
      folder.files.set(path, { text, lastModified: clock });
    },
  };
  return folder;
}

/** An in-memory folder host. `saved` = a folder from an earlier visit. */
export function createMemoryFolderHost(
  options: { saved?: MemoryFolder | null; supported?: boolean } = {},
): MemoryFolderHost {
  const host: MemoryFolderHost = {
    saved: options.saved ?? null,
    nextPick: null,
    supported: options.supported ?? true,
    isSupported: () => host.supported,
    loadSaved: () => Promise.resolve(host.saved),
    pick: () => {
      const picked = host.nextPick;
      if (picked) host.saved = picked;
      return Promise.resolve(picked);
    },
  };
  return host;
}
