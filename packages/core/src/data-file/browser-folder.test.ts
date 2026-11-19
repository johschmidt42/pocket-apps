import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { createBrowserFolderHost, wrapDirectory } from "./browser-folder.ts";
import type { DataFolder } from "./folder.ts";
import type { OneDrive } from "./onedrive-folder.ts";
import { indexedDbStore, type KeyValueStore } from "./settings-store.ts";

// A small in-memory stand-in for the directory handles of Chrome. jsdom has none.
type FakeDirectory = FileSystemDirectoryHandle & { files: Map<string, File> };

function notFound(): DOMException {
  return new DOMException("Not found", "NotFoundError");
}

function fakeDirectory(name: string, permission?: PermissionState): FakeDirectory {
  const files = new Map<string, File>();
  const folders = new Map<string, FakeDirectory>();
  let clock = 100;

  function fileHandle(fileName: string): FileSystemFileHandle {
    return {
      kind: "file",
      name: fileName,
      getFile: () => {
        const file = files.get(fileName);
        return file ? Promise.resolve(file) : Promise.reject(notFound());
      },
      createWritable: () => {
        const parts: (string | Blob)[] = [];
        return Promise.resolve({
          write: (chunk: string | Blob) => {
            parts.push(chunk);
            return Promise.resolve();
          },
          close: () => {
            clock += 1;
            files.set(fileName, new File(parts, fileName, { lastModified: clock }));
            return Promise.resolve();
          },
        });
      },
    } as unknown as FileSystemFileHandle;
  }

  const directory = {
    kind: "directory",
    name,
    files,
    getDirectoryHandle: (folderName: string, options?: { create?: boolean }) => {
      let folder = folders.get(folderName);
      if (!folder && options?.create) {
        folder = fakeDirectory(folderName);
        folders.set(folderName, folder);
      }
      return folder ? Promise.resolve(folder) : Promise.reject(notFound());
    },
    removeEntry: (fileName: string) => {
      if (fileName === "gesperrt.txt") {
        return Promise.reject(new DOMException("No access", "NotAllowedError"));
      }
      return files.delete(fileName) ? Promise.resolve() : Promise.reject(notFound());
    },
    getFileHandle: (fileName: string, options?: { create?: boolean }) =>
      files.has(fileName) || options?.create
        ? Promise.resolve(fileHandle(fileName))
        : Promise.reject(notFound()),
    ...(permission && {
      queryPermission: () => Promise.resolve(permission),
      requestPermission: () => Promise.resolve("granted"),
    }),
  };
  return directory as unknown as FakeDirectory;
}

function memoryStore(): KeyValueStore & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>();
  return {
    values,
    get: (key) => Promise.resolve(values.get(key)),
    set: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
  };
}

describe("wrapDirectory", () => {
  it("writes, reads and removes files with bytes", async () => {
    const folder = wrapDirectory(fakeDirectory("Daten"));
    const photo = new Blob(["jpeg"], { type: "image/jpeg" });

    expect(await folder.readBlob("bilder/foto.jpg")).toBeNull();
    await folder.write("bilder/foto.jpg", photo);
    expect(await (await folder.readBlob("bilder/foto.jpg"))?.text()).toBe("jpeg");

    await folder.remove("bilder/foto.jpg");
    expect(await folder.readBlob("bilder/foto.jpg")).toBeNull();
    // A missing file or folder is no error.
    await folder.remove("bilder/foto.jpg");
    await folder.remove("fehlt/foto.jpg");
  });

  it("passes on other errors of a remove", async () => {
    const folder = wrapDirectory(fakeDirectory("Daten"));

    await expect(folder.remove("gesperrt.txt")).rejects.toThrow("No access");
  });

  it("writes and reads files, also in sub-folders", async () => {
    const folder = wrapDirectory(fakeDirectory("Daten"));

    expect(folder.name).toBe("Daten");
    expect(await folder.read("demo.json")).toBeNull();
    expect(await folder.lastModified("bilder/a.txt")).toBeNull();

    const time = await folder.write("bilder/a.txt", "hallo");

    expect(await folder.read("bilder/a.txt")).toEqual({ text: "hallo", lastModified: time });
    expect(await folder.lastModified("bilder/a.txt")).toBe(time);
  });

  it("passes on errors other than a missing file", async () => {
    const root = fakeDirectory("Daten");
    root.getFileHandle = () => Promise.reject(new DOMException("No", "NotAllowedError"));

    await expect(wrapDirectory(root).read("demo.json")).rejects.toThrow("No");
  });

  it("asks the browser for access when the browser supports it", async () => {
    const folder = wrapDirectory(fakeDirectory("Daten", "prompt"));

    expect(await folder.queryAccess()).toBe("prompt");
    expect(await folder.requestAccess()).toBe("granted");
  });

  it("has access when the browser has no permission functions", async () => {
    const folder = wrapDirectory(fakeDirectory("Daten"));

    expect(await folder.queryAccess()).toBe("granted");
    expect(await folder.requestAccess()).toBe("granted");
  });
});

/** A stand-in for OneDrive. `finishLogin` can mark OneDrive as the picked storage. */
function fakeOneDrive(store: KeyValueStore, loginDone = false): OneDrive & { forgotten: boolean } {
  const fake = {
    forgotten: false,
    folder: { name: "OneDrive", kind: "onedrive" } as DataFolder,
    startLogin: vi.fn(() => new Promise<never>(() => undefined)),
    finishLogin: async () => {
      if (loginDone) await store.set("data-folder", "onedrive");
    },
    forget: () => {
      fake.forgotten = true;
      return Promise.resolve();
    },
  };
  return fake;
}

describe("createBrowserFolderHost", () => {
  it("offers a local folder only in browsers with a folder dialog", () => {
    const store = memoryStore();
    const host = createBrowserFolderHost(store, fakeOneDrive(store));

    expect(host.kinds()).toEqual(["onedrive"]);

    vi.stubGlobal("showDirectoryPicker", () => Promise.resolve(fakeDirectory("Daten")));

    expect(host.kinds()).toEqual(["local", "onedrive"]);
  });

  it("offers OneDrive only with Web Crypto", () => {
    const store = memoryStore();
    vi.stubGlobal("crypto", {});

    expect(createBrowserFolderHost(store, fakeOneDrive(store)).kinds()).toEqual([]);
  });

  it("gives no local folder without a folder dialog", async () => {
    const store = memoryStore();

    expect(await createBrowserFolderHost(store, fakeOneDrive(store)).pick("local")).toBeNull();
  });

  it("remembers the picked folder and forgets the OneDrive login", async () => {
    const store = memoryStore();
    const oneDrive = fakeOneDrive(store);
    const picker = vi.fn(() => Promise.resolve(fakeDirectory("Daten")));
    vi.stubGlobal("showDirectoryPicker", picker);
    const host = createBrowserFolderHost(store, oneDrive);

    expect(await host.loadSaved()).toBeNull();
    expect((await host.pick("local"))?.name).toBe("Daten");
    expect(picker).toHaveBeenCalledWith({ id: "pocket-apps-data", mode: "readwrite" });
    expect(oneDrive.forgotten).toBe(true);
    expect((await host.loadSaved())?.kind).toBe("local");
  });

  it("starts the OneDrive login when the person picks OneDrive", () => {
    const store = memoryStore();
    const oneDrive = fakeOneDrive(store);

    void createBrowserFolderHost(store, oneDrive).pick("onedrive");

    expect(oneDrive.startLogin).toHaveBeenCalledWith(true);
  });

  it("gives OneDrive after a finished login and on later visits", async () => {
    const store = memoryStore();
    const host = createBrowserFolderHost(store, fakeOneDrive(store, true));

    expect(await host.loadSaved()).toMatchObject({ name: "OneDrive", kind: "onedrive" });
    expect(store.values.get("data-folder")).toBe("onedrive");
  });

  it("ignores saved values that are not a folder", async () => {
    const store = memoryStore();
    const host = createBrowserFolderHost(store, fakeOneDrive(store));

    for (const value of ["Daten", null, {}, { kind: "file" }, { kind: "directory" }]) {
      store.values.set("data-folder", value);
      expect(await host.loadSaved()).toBeNull();
    }
  });

  it("returns null when the person cancels the dialog", async () => {
    const store = memoryStore();
    vi.stubGlobal("showDirectoryPicker", () =>
      Promise.reject(new DOMException("Cancel", "AbortError")),
    );

    expect(await createBrowserFolderHost(store, fakeOneDrive(store)).pick("local")).toBeNull();
  });

  it("passes on other dialog errors", async () => {
    const store = memoryStore();
    vi.stubGlobal("showDirectoryPicker", () => Promise.reject(new Error("blocked")));

    await expect(createBrowserFolderHost(store, fakeOneDrive(store)).pick("local")).rejects.toThrow(
      "blocked",
    );
  });

  it("uses IndexedDB and the real OneDrive by default", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());

    expect(await createBrowserFolderHost().loadSaved()).toBeNull();
  });
});

describe("indexedDbStore", () => {
  it("keeps values", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());

    expect(await indexedDbStore.get("a")).toBeUndefined();
    await indexedDbStore.set("a", { b: 1 });
    expect(await indexedDbStore.get("a")).toEqual({ b: 1 });
  });

  it("fails when the database does not open", async () => {
    const open = { error: null as DOMException | null, onerror: () => undefined };
    vi.stubGlobal("indexedDB", {
      open: () => {
        queueMicrotask(() => {
          open.onerror();
        });
        return open;
      },
    });

    await expect(indexedDbStore.get("a")).rejects.toThrow("IndexedDB failed.");
  });

  it("fails when the transaction fails", async () => {
    const close = vi.fn();
    const transaction = {
      error: new DOMException("Full", "QuotaExceededError"),
      objectStore: () => ({ put: () => ({}) }),
      onerror: () => undefined,
    };
    const open = {
      result: { transaction: () => transaction, close },
      onsuccess: () => undefined,
    };
    vi.stubGlobal("indexedDB", {
      open: () => {
        queueMicrotask(() => {
          open.onsuccess();
          transaction.onerror();
        });
        return open;
      },
    });

    await expect(indexedDbStore.set("a", 1)).rejects.toThrow("Full");
    expect(close).toHaveBeenCalled();
  });
});
