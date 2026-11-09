// Reads and writes the data file.
// Chrome and Edge: File System Access API. The app writes directly into the file.
// Other browsers: file input to open, download to save.

/** A file that the app can write to again. Only `name` is public. */
export type FileHandle = { readonly name: string };

export type OpenedFile = {
  name: string;
  text: string;
  /** Only in Chrome and Edge. `null` in other browsers. */
  handle: FileHandle | null;
};

/** All file operations of the data file store. Tests use a fake (see `testing.ts`). */
export type FileAccess = {
  /** True if the browser can write directly into a file (Chrome, Edge). */
  supportsDirectSave: () => boolean;
  /** Lets the user pick a file. Returns `null` if the user cancels. */
  openFile: () => Promise<OpenedFile | null>;
  /** Lets the user choose where to create a new file. Returns `null` if the user cancels. */
  createFile: (suggestedName: string) => Promise<FileHandle | null>;
  /** Overwrites the file behind the handle. */
  writeFile: (handle: FileHandle, text: string) => Promise<void>;
  /** Starts a download of the text as a file. Works in all browsers. */
  downloadFile: (name: string, text: string) => void;
};

type FilePickerType = {
  description: string;
  accept: Record<string, string[]>;
};

// These functions are not in the TypeScript DOM types yet.
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Declaration merging with FileSystemHandle needs an interface.
  interface FileSystemHandle {
    requestPermission?: (descriptor: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Declaration merging with Window needs an interface.
  interface Window {
    showOpenFilePicker?: (options?: {
      types?: FilePickerType[];
      multiple?: boolean;
    }) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: {
      types?: FilePickerType[];
      suggestedName?: string;
    }) => Promise<FileSystemFileHandle>;
  }
}

const FILE_TYPES: FilePickerType[] = [
  { description: "Pocket-Apps-Daten", accept: { "application/json": [".json"] } },
];

/** Time before the app frees the memory of a download. Some browsers start the download late. */
export const DOWNLOAD_REVOKE_MS = 1000;

/**
 * Asks for write access right after the user opened a file (Chrome, Edge).
 * Without it, the first automatic save can fail. Errors do not matter here:
 * a later save asks again.
 */
async function requestWriteAccess(handle: FileSystemFileHandle): Promise<void> {
  try {
    await handle.requestPermission?.({ mode: "readwrite" });
  } catch {
    // A later save asks again.
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isSystemHandle(handle: FileHandle): handle is FileSystemFileHandle {
  return "createWritable" in handle && typeof handle.createWritable === "function";
}

/** Time to wait after a "cancel" event for a late "change" event. */
export const CANCEL_GRACE_MS = 1000;

function pickWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;
    let done = false;
    const finish = (file: File | null) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener("change", () => {
      finish(input.files?.[0] ?? null);
    });
    // Firefox can send "cancel" before "change" for a real selection. So wait a moment.
    input.addEventListener("cancel", () => {
      setTimeout(() => {
        finish(null);
      }, CANCEL_GRACE_MS);
    });
    // Firefox does not report the selection reliably for an input outside the document.
    document.body.append(input);
    input.click();
  });
}

export const browserFileAccess: FileAccess = {
  supportsDirectSave: () =>
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function",

  openFile: async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false });
        if (!handle) return null;
        await requestWriteAccess(handle);
        const file = await handle.getFile();
        return { name: file.name, text: await file.text(), handle };
      } catch (error) {
        if (isAbort(error)) return null;
        throw error;
      }
    }
    const file = await pickWithInput();
    if (!file) return null;
    return { name: file.name, text: await file.text(), handle: null };
  },

  createFile: async (suggestedName) => {
    if (!window.showSaveFilePicker) return null;
    try {
      return await window.showSaveFilePicker({ types: FILE_TYPES, suggestedName });
    } catch (error) {
      if (isAbort(error)) return null;
      throw error;
    }
  },

  writeFile: async (handle, text) => {
    if (!isSystemHandle(handle)) {
      throw new Error("Die App kann nicht direkt in diese Datei speichern.");
    }
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  },

  downloadFile: (name, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, DOWNLOAD_REVOKE_MS);
  },
};
