import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { aiMessage, askAi, type AiFailure } from "./ask.ts";
import type { AiAccess } from "./settings.ts";

const schema = z.object({ answer: z.number() });
const REQUEST = {
  instructions: "Rechne.",
  messages: [{ role: "user" as const, text: "1+1" }],
  schema,
};

const CLAUDE: AiAccess = { provider: "anthropic", apiKey: "sk-ant-1", model: "claude-opus-5-5" };
const OPENAI: AiAccess = { provider: "openai", apiKey: "sk-2", model: "gpt-x" };

/** A JSON answer. It makes a new `Response` per call: the SDKs retry some errors. */
function json(body: unknown, status = 200): () => Response {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      // No wait before a retry, so that the tests stay fast.
      headers: { "content-type": "application/json", "retry-after-ms": "1" },
    });
}

function claudeMessage(
  content: unknown[],
  stopReason = "end_turn",
  model = "claude-opus-5-5",
  cache = { cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
) {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 500, ...cache },
  };
}

function openAiResponse(
  content: unknown[],
  usage: unknown = {
    input_tokens: 10,
    input_tokens_details: { cached_tokens: 4 },
    output_tokens: 5,
    total_tokens: 15,
  },
) {
  return {
    id: "resp_1",
    object: "response",
    created_at: 0,
    status: "completed",
    model: "gpt-x",
    output: [{ type: "message", id: "m1", status: "completed", role: "assistant", content }],
    usage,
  };
}

/** A fake `fetch` that answers each call, and keeps the requests. */
function answer(response: () => Response) {
  return vi.fn<typeof globalThis.fetch>(() => Promise.resolve(response()));
}

function body(fetch: ReturnType<typeof answer>): Record<string, unknown> {
  const init = fetch.mock.calls[0]?.[1];
  return JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<string, unknown>;
}

describe("askAi with Claude", () => {
  it("sends the request with fallbacks and parses the answer", async () => {
    const fetch = answer(
      json(
        claudeMessage([
          { type: "thinking", thinking: "1+1 ist 2.", signature: "s" },
          { type: "text", text: '{"answer":2}' },
        ]),
      ),
    );
    const image = { mediaType: "image/png" as const, base64: "aGk=" };

    const result = await askAi(
      CLAUDE,
      { ...REQUEST, messages: [{ role: "user", text: "1+1", images: [image] }] },
      fetch,
    );

    expect(result).toEqual({
      kind: "ok",
      data: { answer: 2 },
      reply: { role: "assistant", text: '{"answer":2}' },
      usage: { inputTokens: 2000, cachedTokens: 0, outputTokens: 500, costUsd: 0.018 },
    });
    const sent = body(fetch);
    expect(sent).toMatchObject({
      model: "claude-opus-5-5",
      system: "Rechne.",
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: "aGk=" } },
            { type: "text", text: "1+1" },
          ],
        },
      ],
    });
    expect(sent).toHaveProperty("output_config.format.type", "json_schema");
    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
  });

  it("sends no fallbacks for a model without them", async () => {
    const fetch = answer(json(claudeMessage([{ type: "text", text: '{"answer":2}' }])));

    const result = await askAi({ ...CLAUDE, model: "claude-haiku-4-5" }, REQUEST, fetch);

    expect(result).toMatchObject({ kind: "ok", data: { answer: 2 } });
    expect(body(fetch)).not.toHaveProperty("fallbacks");
  });

  it("knows a refusal and an answer without data", async () => {
    const refusal = claudeMessage([{ type: "text", text: "Dabei helfe ich nicht." }], "refusal");
    expect(await askAi(CLAUDE, REQUEST, answer(json(refusal)))).toEqual({ kind: "refused" });
    expect(await askAi(CLAUDE, REQUEST, answer(json(claudeMessage([]))))).toEqual({
      kind: "bad-answer",
    });
    const haiku = { ...CLAUDE, model: "claude-haiku-4-5" };
    expect(await askAi(haiku, REQUEST, answer(json(claudeMessage([], "refusal"))))).toEqual({
      kind: "refused",
    });
  });

  it("knows an answer that is not JSON or does not match the schema", async () => {
    for (const text of ["Zwei.", '{"answer":"zwei"}']) {
      const fetch = answer(json(claudeMessage([{ type: "text", text }])));
      expect(await askAi(CLAUDE, REQUEST, fetch)).toEqual({ kind: "bad-answer" });
    }
  });

  it("uses the price of the model that answered after a fallback", async () => {
    const fallback = claudeMessage(
      [{ type: "text", text: '{"answer":2}' }],
      "end_turn",
      "claude-sonnet-5-5",
    );

    expect(await askAi(CLAUDE, REQUEST, answer(json(fallback)))).toMatchObject({
      usage: { costUsd: 0.009 },
    });
  });
});

describe("askAi with OpenAI", () => {
  it("sends the request and parses the answer", async () => {
    const fetch = answer(
      json(openAiResponse([{ type: "output_text", text: '{"answer":2}', annotations: [] }])),
    );
    const image = { mediaType: "image/jpeg" as const, base64: "aGk=" };

    const result = await askAi(
      OPENAI,
      { ...REQUEST, messages: [{ role: "user", text: "1+1", images: [image] }] },
      fetch,
    );

    expect(result).toEqual({
      kind: "ok",
      data: { answer: 2 },
      reply: { role: "assistant", text: '{"answer":2}' },
      usage: { inputTokens: 10, cachedTokens: 4, outputTokens: 5, costUsd: null },
    });
    expect(body(fetch)).toMatchObject({
      model: "gpt-x",
      instructions: "Rechne.",
      input: [
        {
          role: "user",
          content: [
            { type: "input_image", image_url: "data:image/jpeg;base64,aGk=", detail: "auto" },
            { type: "input_text", text: "1+1" },
          ],
        },
      ],
      text: { format: { type: "json_schema", name: "answer" } },
    });
  });

  it("knows a refusal, an answer without data and a missing usage", async () => {
    expect(
      await askAi(
        OPENAI,
        REQUEST,
        answer(json(openAiResponse([{ type: "refusal", refusal: "Nein." }]))),
      ),
    ).toEqual({ kind: "refused" });
    expect(await askAi(OPENAI, REQUEST, answer(json(openAiResponse([]))))).toEqual({
      kind: "bad-answer",
    });
    const wrong = openAiResponse([{ type: "output_text", text: '{"x":1}', annotations: [] }]);
    expect(await askAi(OPENAI, REQUEST, answer(json(wrong)))).toEqual({ kind: "bad-answer" });
    expect(
      await askAi(
        OPENAI,
        REQUEST,
        answer(
          json(
            openAiResponse([{ type: "output_text", text: '{"answer":1}', annotations: [] }], null),
          ),
        ),
      ),
    ).toMatchObject({ kind: "ok", usage: { inputTokens: 0, cachedTokens: 0, outputTokens: 0 } });
  });

  it("knows an empty quota", async () => {
    const quota = json(
      { error: { message: "quota", type: "insufficient_quota", code: "insufficient_quota" } },
      429,
    );
    expect(await askAi(OPENAI, REQUEST, answer(quota))).toEqual({ kind: "no-credit" });
  });
});

describe("askAi with a conversation", () => {
  const image = { mediaType: "image/png" as const, base64: "aGk=" };
  const CONVERSATION = {
    ...REQUEST,
    messages: [
      { role: "user" as const, text: "Rechne das Bild.", images: [image] },
      { role: "assistant" as const, text: '{"answer":0}' },
      { role: "user" as const, text: "Nimm 1+1." },
    ],
  };

  it("sends all messages to Claude and counts the cache", async () => {
    const cache = { cache_creation_input_tokens: 300, cache_read_input_tokens: 1500 };
    const fetch = answer(
      json(claudeMessage([{ type: "text", text: '{"answer":2}' }], "end_turn", undefined, cache)),
    );

    const result = await askAi(CLAUDE, CONVERSATION, fetch);

    expect(body(fetch)).toMatchObject({
      messages: [
        { role: "user", content: [{ type: "image" }, { type: "text", text: "Rechne das Bild." }] },
        { role: "assistant", content: [{ type: "text", text: '{"answer":0}' }] },
        { role: "user", content: [{ type: "text", text: "Nimm 1+1." }] },
      ],
    });
    // 2000 new × 4 $ + 300 written × 5 $ + 1500 read × 0.20 $ + 500 output × 20 $, per million.
    expect(result).toMatchObject({
      usage: { inputTokens: 3800, cachedTokens: 1500, outputTokens: 500, costUsd: 0.0198 },
    });
  });

  it("sends all messages to OpenAI", async () => {
    const fetch = answer(
      json(openAiResponse([{ type: "output_text", text: '{"answer":2}', annotations: [] }])),
    );

    await askAi(OPENAI, CONVERSATION, fetch);

    expect(body(fetch)).toMatchObject({
      input: [
        { role: "user", content: [{ type: "input_image" }, { type: "input_text" }] },
        { role: "assistant", content: '{"answer":0}' },
        { role: "user", content: [{ type: "input_text", text: "Nimm 1+1." }] },
      ],
    });
  });
});

describe("askAi errors", () => {
  it.each([
    [401, "invalid-key"],
    [402, "no-credit"],
    [403, "no-permission"],
    [429, "rate-limit"],
    [503, "overloaded"],
    [529, "overloaded"],
  ])("maps the status %i at both providers to %s", async (status, kind) => {
    const error = () => answer(json({ error: { type: "x", message: "nope" } }, status));
    expect(await askAi(CLAUDE, REQUEST, error())).toEqual({ kind });
    expect(await askAi(OPENAI, REQUEST, error())).toEqual({ kind });
  });

  it("knows other errors, no internet and a canceled request", async () => {
    const result = await askAi(
      CLAUDE,
      REQUEST,
      answer(json({ error: { type: "x", message: "kaputt" } }, 500)),
    );
    expect(result.kind).toBe("error");

    const offline: typeof globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    expect(await askAi(OPENAI, REQUEST, offline)).toEqual({ kind: "offline" });

    const controller = new AbortController();
    controller.abort();
    expect(
      await askAi(CLAUDE, { ...REQUEST, signal: controller.signal }, answer(json({}))),
    ).toEqual({
      kind: "canceled",
    });
    expect(
      await askAi(OPENAI, { ...REQUEST, signal: controller.signal }, answer(json({}))),
    ).toEqual({
      kind: "canceled",
    });
  });

  it("reports a broken response of the provider", async () => {
    const broken = () =>
      new Response("{kaputt", { headers: { "content-type": "application/json" } });

    expect((await askAi(CLAUDE, REQUEST, answer(broken))).kind).toBe("error");
  });

  it("uses the fetch of the browser by default", async () => {
    const fetch = answer(json(claudeMessage([{ type: "text", text: '{"answer":2}' }])));
    vi.stubGlobal("fetch", fetch);

    expect((await askAi(CLAUDE, REQUEST)).kind).toBe("ok");
    expect(fetch).toHaveBeenCalled();
  });

  it("says in German what went wrong", () => {
    const kinds: AiFailure[] = [
      { kind: "invalid-key" },
      { kind: "no-permission" },
      { kind: "no-credit" },
      { kind: "rate-limit" },
      { kind: "overloaded" },
      { kind: "offline" },
      { kind: "canceled" },
      { kind: "refused" },
      { kind: "bad-answer" },
      { kind: "error", message: "kaputt" },
    ];
    const messages = kinds.map(aiMessage);
    expect(new Set(messages).size).toBe(kinds.length);
    expect(messages.at(-1)).toBe("Die Anfrage an die KI ist fehlgeschlagen: kaputt");
    expect(messages[2]).toBe(
      "Dein Guthaben beim Anbieter ist aufgebraucht, oder das Ausgabelimit ist erreicht.",
    );
  });
});
