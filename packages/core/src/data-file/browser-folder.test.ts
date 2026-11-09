import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import {
  createBrowserFolderHost,
  indexedDbStore,
  wrapDirectory,
  type KeyValueStore,
} from "./browser-folder.ts";

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
        let text = "";
        return Promise.resolve({
          write: (chunk: string) => {
            text += chunk;
            return Promise.resolve();
          },
          close: () => {
            clock += 1;
            files.set(fileName, new File([text], fileName, { lastModified: clock }));
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

describe("createBrowserFolderHost", () => {
  it("supports only browsers with a folder dialog", async () => {
    const host = createBrowserFolderHost(memoryStore());

    expect(host.isSupported()).toBe(false);
    expect(await host.pick()).toBeNull();

    vi.stubGlobal("showDirectoryPicker", () => Promise.resolve(fakeDirectory("Daten")));

    expect(host.isSupported()).toBe(true);
  });

  it("remembers the picked folder", async () => {
    const store = memoryStore();
    const picker = vi.fn(() => Promise.resolve(fakeDirectory("Daten")));
    vi.stubGlobal("showDirectoryPicker", picker);
    const host = createBrowserFolderHost(store);

    expect(await host.loadSaved()).toBeNull();
    expect((await host.pick())?.name).toBe("Daten");
    expect(picker).toHaveBeenCalledWith({ id: "pocket-apps-data", mode: "readwrite" });
    expect((await host.loadSaved())?.name).toBe("Daten");
  });

  it("ignores saved values that are not a folder", async () => {
    const store = memoryStore();
    const host = createBrowserFolderHost(store);

    for (const value of ["Daten", null, {}, { kind: "file" }, { kind: "directory" }]) {
      store.values.set("data-folder", value);
      expect(await host.loadSaved()).toBeNull();
    }
  });

  it("returns null when the person cancels the dialog", async () => {
    vi.stubGlobal("showDirectoryPicker", () =>
      Promise.reject(new DOMException("Cancel", "AbortError")),
    );

    expect(await createBrowserFolderHost(memoryStore()).pick()).toBeNull();
  });

  it("passes on other dialog errors", async () => {
    vi.stubGlobal("showDirectoryPicker", () => Promise.reject(new Error("blocked")));

    await expect(createBrowserFolderHost(memoryStore()).pick()).rejects.toThrow("blocked");
  });

  it("uses IndexedDB by default", async () => {
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
