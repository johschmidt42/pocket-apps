import { afterEach, describe, expect, it, vi } from "vitest";
import {
  browserFileAccess,
  CANCEL_GRACE_MS,
  DOWNLOAD_REVOKE_MS,
  type FileHandle,
} from "./file-access.ts";

const files = browserFileAccess;

function abortError(): DOMException {
  return new DOMException("The user aborted a request.", "AbortError");
}

function systemHandle(
  file: File,
  requestPermission?: FileSystemHandle["requestPermission"],
): FileSystemFileHandle {
  return {
    name: file.name,
    getFile: () => Promise.resolve(file),
    requestPermission,
  } as FileSystemFileHandle;
}

/** Simulates the hidden file input: on click, it fires the given events in order. */
function simulateInput(events: ("change" | "cancel")[], selected: File[] = []) {
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
    this: HTMLInputElement,
  ) {
    expect(this.isConnected).toBe(true);
    Object.defineProperty(this, "files", { value: selected });
    for (const event of events) this.dispatchEvent(new Event(event));
  });
}

afterEach(() => {
  vi.useRealTimers();
  delete window.showOpenFilePicker;
  delete window.showSaveFilePicker;
});

describe("supportsDirectSave", () => {
  it("is false without the File System Access API", () => {
    expect(files.supportsDirectSave()).toBe(false);
  });

  it("is true when both pickers exist", () => {
    window.showOpenFilePicker = vi.fn();
    window.showSaveFilePicker = vi.fn();

    expect(files.supportsDirectSave()).toBe(true);
  });
});

describe("openFile with the File System Access API", () => {
  it("returns name, text and handle of the picked file", async () => {
    const handle = systemHandle(new File(["hello"], "data.json"));
    window.showOpenFilePicker = vi.fn(() => Promise.resolve([handle]));

    await expect(files.openFile()).resolves.toEqual({ name: "data.json", text: "hello", handle });
  });

  it("asks for write access right after the user picked the file", async () => {
    const requestPermission = vi.fn(() => Promise.resolve<PermissionState>("granted"));
    const handle = systemHandle(new File(["hello"], "data.json"), requestPermission);
    window.showOpenFilePicker = vi.fn(() => Promise.resolve([handle]));

    await files.openFile();

    expect(requestPermission).toHaveBeenCalledWith({ mode: "readwrite" });
  });

  it("still opens the file when the write access request fails", async () => {
    const requestPermission = vi.fn(() => Promise.reject(new Error("no user gesture")));
    const handle = systemHandle(new File(["hello"], "data.json"), requestPermission);
    window.showOpenFilePicker = vi.fn(() => Promise.resolve([handle]));

    await expect(files.openFile()).resolves.toMatchObject({ text: "hello" });
  });

  it("returns null when the picker returns no file", async () => {
    window.showOpenFilePicker = vi.fn(() => Promise.resolve([]));

    await expect(files.openFile()).resolves.toBeNull();
  });

  it("returns null when the user cancels", async () => {
    window.showOpenFilePicker = vi.fn(() => Promise.reject(abortError()));

    await expect(files.openFile()).resolves.toBeNull();
  });

  it("passes other errors on", async () => {
    window.showOpenFilePicker = vi.fn(() => Promise.reject(new Error("broken")));

    await expect(files.openFile()).rejects.toThrow("broken");
  });
});

describe("openFile with the file input fallback", () => {
  it("returns name and text of the picked file, without handle", async () => {
    simulateInput(["change"], [new File(["hello"], "data.json")]);

    await expect(files.openFile()).resolves.toEqual({
      name: "data.json",
      text: "hello",
      handle: null,
    });
    expect(document.querySelector("input[type=file]")).toBeNull();
  });

  it("returns null when no file is selected", async () => {
    simulateInput(["change"], []);

    await expect(files.openFile()).resolves.toBeNull();
  });

  it("returns null a moment after the user cancels", async () => {
    vi.useFakeTimers();
    simulateInput(["cancel"]);

    const result = files.openFile();
    await vi.advanceTimersByTimeAsync(CANCEL_GRACE_MS);

    await expect(result).resolves.toBeNull();
  });

  it("returns the file when a selection follows a cancel event (Firefox)", async () => {
    vi.useFakeTimers();
    simulateInput(["cancel", "change"], [new File(["hello"], "data.json")]);

    const result = files.openFile();
    await vi.advanceTimersByTimeAsync(CANCEL_GRACE_MS);

    await expect(result).resolves.toMatchObject({ name: "data.json", text: "hello" });
  });
});

describe("createFile", () => {
  it("returns null without the File System Access API", async () => {
    await expect(files.createFile("new.json")).resolves.toBeNull();
  });

  it("returns the handle of the new file", async () => {
    const handle = systemHandle(new File([""], "new.json"));
    const picker = vi.fn(() => Promise.resolve(handle));
    window.showSaveFilePicker = picker;

    await expect(files.createFile("new.json")).resolves.toBe(handle);
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: "new.json" }));
  });

  it("returns null when the user cancels", async () => {
    window.showSaveFilePicker = vi.fn(() => Promise.reject(abortError()));

    await expect(files.createFile("new.json")).resolves.toBeNull();
  });

  it("passes other errors on", async () => {
    window.showSaveFilePicker = vi.fn(() => Promise.reject(new Error("broken")));

    await expect(files.createFile("new.json")).rejects.toThrow("broken");
  });
});

describe("writeFile", () => {
  it("writes the text and closes the file", async () => {
    const writable = { write: vi.fn(), close: vi.fn() };
    const handle = { name: "a.json", createWritable: vi.fn(() => Promise.resolve(writable)) };

    await files.writeFile(handle, "content");

    expect(writable.write).toHaveBeenCalledWith("content");
    expect(writable.close).toHaveBeenCalled();
  });

  it("rejects a handle that is not from the File System Access API", async () => {
    const handle: FileHandle = { name: "a.json" };

    await expect(files.writeFile(handle, "content")).rejects.toThrow(/nicht direkt/);
  });
});

describe("downloadFile", () => {
  it("downloads the text and frees the memory a moment later", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:demo");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.isConnected).toBe(true);
    });

    files.downloadFile("data.json", "content");

    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("data.json");
    expect(link.href).toBe("blob:demo");
    expect(link.isConnected).toBe(false);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DOWNLOAD_REVOKE_MS);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:demo");
  });
});
