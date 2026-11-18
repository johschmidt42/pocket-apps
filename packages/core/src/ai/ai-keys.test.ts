import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import type { KeyValueStore } from "../data-file/browser-folder.ts";
import { readAiKeys, writeAiKeys } from "./ai-keys.ts";

describe("AI keys in the browser", () => {
  it("has no keys at first, and keeps the saved keys in IndexedDB", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());

    expect(await readAiKeys()).toEqual({ anthropic: null, openai: null });
    await writeAiKeys({ anthropic: "sk-ant-1", openai: null });
    expect(await readAiKeys()).toEqual({ anthropic: "sk-ant-1", openai: null });
    await writeAiKeys({ anthropic: null, openai: "sk-2" });
    expect(await readAiKeys()).toEqual({ anthropic: null, openai: "sk-2" });
  });

  it("counts a value that is not a text, or an empty text, as no key", async () => {
    const values = new Map<string, unknown>([
      ["ai-key-anthropic", 42],
      ["ai-key-openai", ""],
    ]);
    const store: KeyValueStore = {
      get: (key) => Promise.resolve(values.get(key)),
      set: (key, value) => {
        values.set(key, value);
        return Promise.resolve();
      },
    };

    expect(await readAiKeys(store)).toEqual({ anthropic: null, openai: null });
  });
});
