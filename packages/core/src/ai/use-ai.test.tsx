import { renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DataFolderContext } from "../data-file/data-folder-context.ts";
import type { DataFolder } from "../data-file/folder.ts";
import { createMemoryFolder } from "../data-file/testing.ts";
import { AI_FILE, writeAiSettings } from "./ai-file.ts";
import { writeAiKeys } from "./ai-keys.ts";
import type { AskAi } from "./ask.ts";
import { TEST_AI, useAi } from "./use-ai.ts";

function inFolder(folder: DataFolder) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DataFolderContext value={{ folder, appVersion: "1.0" }}>{children}</DataFolderContext>;
  };
}

const SETTINGS = {
  active: "anthropic" as const,
  models: { anthropic: "claude-opus-5-5", openai: null },
};

describe("useAi", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  it("is not set up without a folder or a provider", async () => {
    expect(renderHook(() => useAi()).result.current.state).toEqual({ status: "not-set-up" });

    const { result } = renderHook(() => useAi(), { wrapper: inFolder(createMemoryFolder()) });
    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "not-set-up" });
    });
  });

  it("is not set up when this browser has no key", async () => {
    // The settings came with the folder, but this browser has no key.
    const folder = createMemoryFolder();
    await writeAiSettings(folder, SETTINGS, "1.0");
    const { result } = renderHook(() => useAi(), { wrapper: inFolder(folder) });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "not-set-up" });
    });
  });

  it("is ready with the provider and model of the user, and asks the provider", async () => {
    const folder = createMemoryFolder();
    await writeAiSettings(folder, SETTINGS, "1.0");
    await writeAiKeys({ anthropic: "sk-ant-1", openai: null });
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m",
            type: "message",
            role: "assistant",
            model: "claude-opus-5-5",
            content: [{ type: "text", text: '{"ok":true}' }],
            stop_reason: "end_turn",
            stop_sequence: null,
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetch);

    const { result } = renderHook(() => useAi(), { wrapper: inFolder(folder) });
    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });
    const state = result.current.state;
    if (state.status !== "ready") throw new Error("not ready");
    expect(state).toMatchObject({ provider: "anthropic", model: "claude-opus-5-5" });

    const answer = await state.ask({
      instructions: "x",
      prompt: "y",
      schema: z.object({ ok: z.boolean() }),
    });
    expect(answer).toMatchObject({ kind: "ok", data: { ok: true } });
    expect(fetch).toHaveBeenCalled();
  });

  it("reports a broken file", async () => {
    const folder = createMemoryFolder();
    folder.files.set(AI_FILE, { text: "{nope", lastModified: 1 });
    const { result } = renderHook(() => useAi(), { wrapper: inFolder(folder) });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "error",
        message: "Die Datei ist keine gültige JSON-Datei.",
      });
    });
  });

  it("uses a fake in tests of an app", () => {
    const fake: AskAi = () => Promise.resolve({ kind: "refused" });
    const { result } = renderHook(() => useAi(fake));

    expect(result.current.state).toEqual({ status: "ready", ...TEST_AI, ask: fake });
  });
});
