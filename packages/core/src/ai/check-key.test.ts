import { describe, expect, it, vi } from "vitest";
import { checkKey, checkMessage } from "./check-key.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** A fake `fetch` that answers every request with the same response. */
function answer(response: () => Response): typeof fetch {
  return vi.fn(() => Promise.resolve(response()));
}

const CLAUDE_MODELS = {
  data: [
    {
      type: "model",
      id: "claude-opus-5-5",
      display_name: "Claude Opus 5.5",
      created_at: "2026-10-01T00:00:00Z",
    },
    {
      type: "model",
      id: "claude-haiku-5-5",
      display_name: "Claude Haiku 5.5",
      created_at: "2026-09-01T00:00:00Z",
    },
  ],
  has_more: false,
  first_id: "claude-opus-5-5",
  last_id: "claude-haiku-5-5",
};

const OPENAI_MODELS = {
  object: "list",
  data: [
    { id: "gpt-old", object: "model", created: 100, owned_by: "openai" },
    { id: "text-embedding-3-small", object: "model", created: 300, owned_by: "openai" },
    { id: "gpt-image-1", object: "model", created: 400, owned_by: "openai" },
    { id: "o9-mini", object: "model", created: 200, owned_by: "openai" },
    { id: "gpt-new", object: "model", created: 500, owned_by: "openai" },
  ],
};

describe("key check", () => {
  it("lists the Claude models with their names and sends the key", async () => {
    const fetch = answer(() => json(CLAUDE_MODELS));

    expect(await checkKey("anthropic", " sk-ant-1 ", fetch)).toEqual({
      kind: "ok",
      models: [
        { id: "claude-opus-5-5", name: "Claude Opus 5.5" },
        { id: "claude-haiku-5-5", name: "Claude Haiku 5.5" },
      ],
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(typeof url === "string" ? url : "").toContain("api.anthropic.com/v1/models");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer sk-ant-1");
    expect(headers.get("anthropic-dangerous-direct-browser-access")).toBe("true");
  });

  it("lists only the OpenAI models for text, newest first", async () => {
    const fetch = answer(() => json(OPENAI_MODELS));

    expect(await checkKey("openai", "sk-2", fetch)).toEqual({
      kind: "ok",
      models: [
        { id: "gpt-new", name: "gpt-new" },
        { id: "o9-mini", name: "o9-mini" },
        { id: "gpt-old", name: "gpt-old" },
      ],
    });
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk-2");
  });

  it("knows a wrong key and a missing permission at both providers", async () => {
    const error = (status: number) =>
      answer(() => json({ error: { type: "x", message: "nope" } }, status));
    expect(await checkKey("anthropic", "k", error(401))).toEqual({ kind: "invalid-key" });
    expect(await checkKey("openai", "k", error(401))).toEqual({ kind: "invalid-key" });
    expect(await checkKey("anthropic", "k", error(403))).toEqual({ kind: "no-permission" });
    expect(await checkKey("openai", "k", error(403))).toEqual({ kind: "no-permission" });
  });

  it("knows that the computer is offline", async () => {
    const offline: typeof fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    expect(await checkKey("anthropic", "k", offline)).toEqual({ kind: "offline" });
    expect(await checkKey("openai", "k", offline)).toEqual({ kind: "offline" });
  });

  it("gives other errors with their message", async () => {
    const result = await checkKey(
      "anthropic",
      "k",
      answer(() => json({ error: { type: "api_error", message: "down" } }, 500)),
    );
    expect(result.kind).toBe("error");
  });

  it("uses the fetch of the browser by default", async () => {
    const fetch = answer(() => json(CLAUDE_MODELS));
    vi.stubGlobal("fetch", fetch);

    expect((await checkKey("anthropic", "k")).kind).toBe("ok");
    expect(fetch).toHaveBeenCalled();
  });

  it("says in German what went wrong", () => {
    expect(checkMessage({ kind: "invalid-key" })).toBe(
      "Der Key ist ungültig. Prüfe, ob du ihn vollständig kopiert hast.",
    );
    expect(checkMessage({ kind: "no-permission" })).toBe(
      "Der Key hat keine Berechtigung für die Liste der Modelle.",
    );
    expect(checkMessage({ kind: "offline" })).toBe(
      "Keine Verbindung. Prüfe deine Internetverbindung.",
    );
    expect(checkMessage({ kind: "error", message: "down" })).toBe(
      "Die Prüfung ist fehlgeschlagen: down",
    );
  });
});
