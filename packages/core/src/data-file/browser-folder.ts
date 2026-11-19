// The data folder in the browser: a folder on this computer (File System Access API, Chrome and
// Edge) or OneDrive. The choice stays in IndexedDB. Every page of the same web address uses it.
import type { DataFolder, FileSnapshot, FolderHost } from "./folder.ts";
import { createOneDrive, ONEDRIVE_CHOICE, type OneDrive } from "./onedrive-folder.ts";
import { FOLDER_KEY, indexedDbStore, type KeyValueStore } from "./settings-store.ts";

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
    kind: "local",
    queryAccess: async () => (await root.queryPermission?.({ mode: "readwrite" })) ?? "granted",
    requestAccess: async () => (await root.requestPermission?.({ mode: "readwrite" })) ?? "granted",
    read: async (path): Promise<FileSnapshot | null> => {
      const file = await snapshot(path);
      return file ? { text: await file.text(), lastModified: file.lastModified } : null;
    },
    lastModified: async (path) => (await snapshot(path))?.lastModified ?? null,
    readBlob: snapshot,
    write: async (path, content) => {
      const handle = await fileHandle(path, true);
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return (await handle.getFile()).lastModified;
    },
    remove: async (path) => {
      const { folders, file } = splitPath(path);
      try {
        let folder = root;
        for (const name of folders) folder = await folder.getDirectoryHandle(name);
        await folder.removeEntry(file);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    },
  };
}

/**
 * The folder host of the browser: a folder on this computer (Chrome and Edge) or OneDrive (all
 * browsers). `storage` and `oneDrive` are only for tests.
 */
export function createBrowserFolderHost(
  storage: KeyValueStore = indexedDbStore,
  oneDrive: OneDrive = createOneDrive({ store: storage }),
): FolderHost {
  return {
    kinds: () => [
      ...(typeof window.showDirectoryPicker === "function" ? (["local"] as const) : []),
      // The login needs Web Crypto. Browsers have it on https and on localhost.
      ...(typeof crypto.subtle === "object" ? (["onedrive"] as const) : []),
    ],
    loadSaved: async () => {
      // A failed or cancelled login keeps the earlier choice. Only without one, the person sees
      // the error next to the choice.
      const login = await oneDrive.finishLogin().then(
        () => null,
        (error: unknown) => ({ error }),
      );
      const saved = await storage.get(FOLDER_KEY);
      if (saved === ONEDRIVE_CHOICE) return oneDrive.folder;
      if (isDirectoryHandle(saved)) return wrapDirectory(saved);
      if (login) throw login.error;
      return null;
    },
    pick: async (kind) => {
      if (kind === "onedrive") return oneDrive.startLogin({ chooseAccount: true });
      if (!window.showDirectoryPicker) return null;
      try {
        const handle = await window.showDirectoryPicker({
          id: "pocket-apps-data",
          mode: "readwrite",
        });
        await storage.set(FOLDER_KEY, handle);
        await oneDrive.forget();
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
