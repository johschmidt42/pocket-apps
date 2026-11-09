// The data folder in Chrome and Edge (File System Access API).
// The folder handle stays in IndexedDB. Every page of the same web address can use it.
import type { DataFolder, FileSnapshot, FolderHost } from "./folder.ts";

// These functions are not in the TypeScript DOM types yet.
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Declaration merging with Window needs an interface.
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandle>;
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Declaration merging with FileSystemHandle needs an interface.
  interface FileSystemHandle {
    queryPermission?: (descriptor: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
    requestPermission?: (descriptor: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  }
}

/** A small key-value store. The default keeps the values in IndexedDB. */
export type KeyValueStore = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
};

const FOLDER_KEY = "data-folder";

function failure(error: DOMException | null): Error {
  return error ?? new Error("IndexedDB failed.");
}

function inSettingsStore<T>(
  action: (store: IDBObjectStore) => IDBRequest<T>,
  mode: IDBTransactionMode,
) {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open("pocket-apps", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore("settings");
    };
    open.onerror = () => {
      reject(failure(open.error));
    };
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction("settings", mode);
      const result = action(transaction.objectStore("settings"));
      transaction.oncomplete = () => {
        db.close();
        resolve(result.result);
      };
      transaction.onerror = () => {
        db.close();
        reject(failure(transaction.error));
      };
    };
  });
}

/** The key-value store in IndexedDB (database "pocket-apps", store "settings"). */
export const indexedDbStore: KeyValueStore = {
  get: (key) => inSettingsStore((store) => store.get(key), "readonly"),
  set: async (key, value) => {
    await inSettingsStore((store) => store.put(value, key), "readwrite");
  },
};

function isDirectoryHandle(value: unknown): value is FileSystemDirectoryHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "directory" &&
    "getFileHandle" in value
  );
}

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function splitPath(path: string): { folders: string[]; file: string } {
  const slash = path.lastIndexOf("/");
  return {
    folders: slash < 0 ? [] : path.slice(0, slash).split("/"),
    file: path.slice(slash + 1),
  };
}

/** A `DataFolder` on top of a directory handle. */
export function wrapDirectory(root: FileSystemDirectoryHandle): DataFolder {
  async function fileHandle(path: string, create: boolean): Promise<FileSystemFileHandle> {
    const { folders, file } = splitPath(path);
    let folder = root;
    for (const name of folders) folder = await folder.getDirectoryHandle(name, { create });
    return folder.getFileHandle(file, { create });
  }

  async function snapshot(path: string): Promise<File | null> {
    try {
      return await (await fileHandle(path, false)).getFile();
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  return {
    name: root.name,
    queryAccess: async () => (await root.queryPermission?.({ mode: "readwrite" })) ?? "granted",
    requestAccess: async () => (await root.requestPermission?.({ mode: "readwrite" })) ?? "granted",
    read: async (path): Promise<FileSnapshot | null> => {
      const file = await snapshot(path);
      return file ? { text: await file.text(), lastModified: file.lastModified } : null;
    },
    lastModified: async (path) => (await snapshot(path))?.lastModified ?? null,
    write: async (path, text) => {
      const handle = await fileHandle(path, true);
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return (await handle.getFile()).lastModified;
    },
  };
}

/** The folder host of the browser. `storage` is only for tests. */
export function createBrowserFolderHost(storage: KeyValueStore = indexedDbStore): FolderHost {
  return {
    isSupported: () => typeof window.showDirectoryPicker === "function",
    loadSaved: async () => {
      const saved = await storage.get(FOLDER_KEY);
      return isDirectoryHandle(saved) ? wrapDirectory(saved) : null;
    },
    pick: async () => {
      if (!window.showDirectoryPicker) return null;
      try {
        const handle = await window.showDirectoryPicker({
          id: "pocket-apps-data",
          mode: "readwrite",
        });
        await storage.set(FOLDER_KEY, handle);
        return wrapDirectory(handle);
      } catch (error) {
        if (isAbort(error)) return null;
        throw error;
      }
    },
  };
}

/** The data folder of the browser, shared by all pages of the web address. */
export const browserFolderHost = createBrowserFolderHost();
