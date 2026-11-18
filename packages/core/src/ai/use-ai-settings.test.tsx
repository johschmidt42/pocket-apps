import { act, renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataFolderContext } from "../data-file/data-folder-context.ts";
import type { DataFolder } from "../data-file/folder.ts";
import { createMemoryFolder } from "../data-file/testing.ts";
import { AI_FILE } from "./ai-file.ts";
import { readAiKeys } from "./ai-keys.ts";
import { initialAiSettings, noAiKeys, type AiSetup } from "./settings.ts";
import { useAiSettings } from "./use-ai-settings.ts";

const SETUP: AiSetup = {
  settings: { active: "openai", models: { anthropic: null, openai: "gpt-x" } },
  keys: { anthropic: null, openai: "sk-2" },
};

function inFolder(folder: DataFolder) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DataFolderContext value={{ folder, appVersion: "2.0" }}>{children}</DataFolderContext>;
  };
}

describe("useAiSettings", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  it("has no settings without a data folder", async () => {
    const { result } = renderHook(() => useAiSettings());

    expect(result.current.state).toEqual({ status: "no-folder" });
    await expect(result.current.save(SETUP)).rejects.toThrow("Es gibt keinen Datenordner.");
  });

  it("reads the setup, saves the key in the browser and the rest in the file", async () => {
    const folder = createMemoryFolder();
    const { result } = renderHook(() => useAiSettings(), { wrapper: inFolder(folder) });
    expect(result.current.state).toEqual({ status: "loading" });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "ready",
        setup: { settings: initialAiSettings(), keys: noAiKeys() },
      });
    });
    await act(() => result.current.save(SETUP));

    expect(result.current.state).toEqual({ status: "ready", setup: SETUP });
    const file = folder.files.get(AI_FILE)?.text ?? "";
    expect(file).toContain('"savedWith": "2.0"');
    expect(file).not.toContain("sk-2");
    expect(await readAiKeys()).toEqual(SETUP.keys);
  });

  it("reads the file again on reload", async () => {
    const folder = createMemoryFolder();
    const { result } = renderHook(() => useAiSettings(), { wrapper: inFolder(folder) });
    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });
    folder.files.set(AI_FILE, { text: "{nope", lastModified: 2 });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
  });

  it("writes the file also when it saves before the load ends", async () => {
    const folder = createMemoryFolder();
    const slow: DataFolder = { ...folder, read: () => new Promise(() => undefined) };
    const { result } = renderHook(() => useAiSettings(), { wrapper: inFolder(slow) });

    await act(() => result.current.save(SETUP));

    expect(folder.files.get(AI_FILE)?.text).toContain('"active": "openai"');
    expect(result.current.state).toEqual({ status: "ready", setup: SETUP });
  });

  it("shows why it cannot read the file", async () => {
    const broken = createMemoryFolder();
    broken.files.set(AI_FILE, { text: "{nope", lastModified: 1 });
    const failing: DataFolder = {
      ...createMemoryFolder(),
      read: () => Promise.reject(new Error("weg")),
    };

    const { result: brokenResult } = renderHook(() => useAiSettings(), {
      wrapper: inFolder(broken),
    });
    const { result: failingResult } = renderHook(() => useAiSettings(), {
      wrapper: inFolder(failing),
    });

    await waitFor(() => {
      expect(brokenResult.current.state).toEqual({
        status: "error",
        message: "Die Datei ist keine gültige JSON-Datei.",
      });
    });
    await waitFor(() => {
      expect(failingResult.current.state).toEqual({
        status: "error",
        message: "Die App kann die KI-Einstellungen nicht lesen: weg",
      });
    });
  });

  it("ignores a late answer after the component is gone", async () => {
    let finish: (value: null) => void = () => undefined;
    let fail: (error: Error) => void = () => undefined;
    const slow: DataFolder = {
      ...createMemoryFolder(),
      read: () => new Promise((resolve) => (finish = resolve)),
    };
    const slowFailing: DataFolder = {
      ...createMemoryFolder(),
      read: () => new Promise((_resolve, reject) => (fail = reject)),
    };

    const { result: slowResult, unmount: unmountSlow } = renderHook(() => useAiSettings(), {
      wrapper: inFolder(slow),
    });
    const { result: failingResult, unmount: unmountFailing } = renderHook(() => useAiSettings(), {
      wrapper: inFolder(slowFailing),
    });
    unmountSlow();
    unmountFailing();
    finish(null);
    fail(new Error("zu spät"));
    // The keys come from IndexedDB a moment later. Wait until both answers are there.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(slowResult.current.state).toEqual({ status: "loading" });
    expect(failingResult.current.state).toEqual({ status: "loading" });
  });
});
