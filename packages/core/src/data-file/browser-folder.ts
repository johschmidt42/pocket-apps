// The data folder in the browser: a folder on this computer (File System Access API, Chrome and
// Edge) or a cloud storage (OneDrive, Dropbox). The choice stays in IndexedDB. Every page of the
// same web address uses it.
import {
  createCloudSession,
  finishCloudLogin,
  type CloudDeps,
  type CloudProvider,
  type CloudSession,
} from "./cloud-login.ts";
import { createDropboxFolder, DROPBOX } from "./dropbox-folder.ts";
import { isOneOf } from "../one-of.ts";
import {
  checkThenWrite,
  CLOUD_KINDS,
  type CloudKind,
  type DataFolder,
  type FileSnapshot,
  type FolderHost,
} from "./folder.ts";
import { createOneDriveFolder, ONEDRIVE } from "./onedrive-folder.ts";
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

  async function lastModified(path: string): Promise<number | null> {
    return (await snapshot(path))?.lastModified ?? null;
  }

  async function write(path: string, content: string | Blob): Promise<number> {
    const handle = await fileHandle(path, true);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return (await handle.getFile()).lastModified;
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
    lastModified,
    readBlob: snapshot,
    write,
    // The File System Access API has no write on a condition.
    writeIfUnchanged: checkThenWrite(lastModified, write),
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

/** One cloud storage: its data folder, its login and its tokens. */
export type CloudStorage = {
  folder: DataFolder;
  startLogin: (options: { chooseAccount: boolean }) => Promise<never>;
  forget: () => Promise<void>;
};

/** All cloud storages, in the order of the choice. */
export type CloudStorages = {
  storages: Record<CloudKind, CloudStorage>;
  /** Ends a login when a provider sent the person back (see `finishCloudLogin`). */
  finishLogin: () => Promise<void>;
};

const PROVIDERS: Record<
  CloudKind,
  { provider: CloudProvider; folder: (session: CloudSession) => DataFolder }
> = {
  onedrive: { provider: ONEDRIVE, folder: createOneDriveFolder },
  dropbox: { provider: DROPBOX, folder: createDropboxFolder },
};

/** The cloud storages of the browser. `overrides` is only for tests. */
export function createCloudStorages(overrides: Partial<CloudDeps> = {}): CloudStorages {
  const entries = Object.values(PROVIDERS);
  const storage = ({ provider, folder }: (typeof entries)[number]): CloudStorage => {
    const session = createCloudSession(provider, overrides);
    return { folder: folder(session), startLogin: session.startLogin, forget: session.forget };
  };
  return {
    storages: { onedrive: storage(PROVIDERS.onedrive), dropbox: storage(PROVIDERS.dropbox) },
    finishLogin: () =>
      finishCloudLogin(
        entries.map((entry) => entry.provider),
        overrides,
      ),
  };
}

function isCloudKind(value: unknown): value is CloudKind {
  return typeof value === "string" && isOneOf(CLOUD_KINDS, value);
}

/**
 * The folder host of the browser: a folder on this computer (Chrome and Edge) or a cloud storage
 * (all browsers). `storage` and `clouds` are only for tests.
 */
export function createBrowserFolderHost(
  storage: KeyValueStore = indexedDbStore,
  clouds: CloudStorages = createCloudStorages({ store: storage }),
): FolderHost {
  async function forgetClouds(): Promise<void> {
    await Promise.all(Object.values(clouds.storages).map((cloud) => cloud.forget()));
  }

  return {
    // The order of the choice: the cloud storages first, because they work on all devices.
    kinds: () => [
      // The login needs Web Crypto. Browsers have it on https and on localhost.
      ...(typeof crypto.subtle === "object" ? CLOUD_KINDS : []),
      ...(typeof window.showDirectoryPicker === "function" ? (["local"] as const) : []),
    ],
    loadSaved: async () => {
      // A failed or cancelled login keeps the earlier choice. Only without one, the person sees
      // the error next to the choice.
      const login = await clouds.finishLogin().then(
        () => null,
        (error: unknown) => ({ error }),
      );
      const saved = await storage.get(FOLDER_KEY);
      if (isCloudKind(saved)) return clouds.storages[saved].folder;
      if (isDirectoryHandle(saved)) return wrapDirectory(saved);
      if (login) throw login.error;
      return null;
    },
    pick: async (kind) => {
      if (kind !== "local") return clouds.storages[kind].startLogin({ chooseAccount: true });
      if (!window.showDirectoryPicker) return null;
      try {
        const handle = await window.showDirectoryPicker({
          id: "pocket-apps-data",
          mode: "readwrite",
        });
        await storage.set(FOLDER_KEY, handle);
        await forgetClouds();
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
