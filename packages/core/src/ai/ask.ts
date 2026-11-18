import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { errorText } from "../error-text.ts";
import type { AiImage } from "./images.ts";
import { requestCost, type AiUsage } from "./pricing.ts";
import type { AiAccess, AiProvider } from "./settings.ts";

/**
 * One message of a conversation with the AI. A message of the user can have images, for
 * example a photo of a whiteboard. A message of the AI is an earlier answer (`reply`).
 */
export type AiMessage =
  { role: "user"; text: string; images?: readonly AiImage[] } | { role: "assistant"; text: string };

/** One request to the AI: an instruction, the conversation and the shape of the answer. */
export type AiRequest<T> = {
  /** The task and the rules for the AI (system prompt). Keep it the same in a conversation. */
  instructions: string;
  /**
   * The conversation so far. It starts with a message of the user, and the roles alternate.
   * For one question, this is one message. For a follow-up, add the `reply` of the last
   * result and the next message of the user. Put an image only into the message where the
   * user added it: the provider keeps the start of the conversation in its cache.
   */
  messages: readonly AiMessage[];
  /** The answer must match this schema. The app gets the parsed data. */
  schema: z.ZodType<T>;
  /** Cancels the request. */
  signal?: AbortSignal;
};

export type AiFailure =
  | { kind: "invalid-key" }
  | { kind: "no-permission" }
  | { kind: "no-credit" }
  | { kind: "rate-limit" }
  | { kind: "overloaded" }
  | { kind: "offline" }
  | { kind: "canceled" }
  | { kind: "refused" }
  | { kind: "bad-answer" }
  | { kind: "error"; message: string };

/**
 * The result of a request. It never throws. `reply` is the answer as a message: add it to the
 * conversation before the next message of the user.
 */
export type AiResult<T> = { kind: "ok"; data: T; reply: AiMessage; usage: AiUsage } | AiFailure;

/** A function that sends one request. Apps get it from `useAi()`. Tests give a fake. */
export type AskAi = <T>(request: AiRequest<T>) => Promise<AiResult<T>>;

/** The answer can be long (for example a list of results). */
const MAX_TOKENS = 16_000;

/**
 * These Claude models accept server-side fallbacks: if a safety check refuses a request, the API
 * sends it again to a suitable other model. See the Claude API docs on refusals.
 */
const FALLBACK_MODELS: ReadonlySet<string> = new Set([
  "claude-fable-5-2",
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

/** The browser calls the API directly. The key stays in the browser (see ai-keys.ts). */
const BROWSER_OPTIONS = { dangerouslyAllowBrowser: true, maxRetries: 2 } as const;

/**
 * The usage of a Claude request. Claude counts the input in three groups: new input, input that
 * goes into the cache and input from the cache.
 */
function claudeUsage(model: string, usage: Anthropic.Messages.Usage): AiUsage {
  const tokens = {
    input: usage.input_tokens,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    output: usage.output_tokens,
  };
  return {
    inputTokens: tokens.input + tokens.cacheWrite + tokens.cacheRead,
    cachedTokens: tokens.cacheRead,
    outputTokens: tokens.output,
    costUsd: requestCost(model, tokens),
  };
}

/** The answer as a message for the next request. */
function reply(text: string): AiMessage {
  return { role: "assistant", text };
}

/**
 * Validates the answer text with the schema of the request. We do not use the parse helpers of
 * the SDKs: they throw for a wrong answer, and they parse before the app can check for a refusal.
 */
function parseAnswer<T>(
  schema: z.ZodType<T>,
  text: string,
): { kind: "ok"; data: T } | { kind: "bad-answer" } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // For example an answer that the token limit cut off.
    return { kind: "bad-answer" };
  }
  const result = schema.safeParse(json);
  return result.success ? { kind: "ok", data: result.data } : { kind: "bad-answer" };
}

/** Sends the request to Claude. Models with fallbacks use the beta API. */
function sendToClaude<T>(access: AiAccess, request: AiRequest<T>, fetch: typeof globalThis.fetch) {
  const client = new Anthropic({ apiKey: access.apiKey, fetch, ...BROWSER_OPTIONS });
  const messages = request.messages.map((message) => ({
    role: message.role,
    content: [
      ...(message.role === "user" ? (message.images ?? []) : []).map((image) => ({
        type: "image" as const,
        source: { type: "base64" as const, media_type: image.mediaType, data: image.base64 },
      })),
      { type: "text" as const, text: message.text },
    ],
  }));
  const base = {
    model: access.model,
    max_tokens: MAX_TOKENS,
    system: request.instructions,
    messages,
    // Automatic caching: the API keeps the conversation up to the last message for 5 minutes.
    // In the next round, this part costs only a part of the input price.
    cache_control: { type: "ephemeral" as const },
  };
  const options = { signal: request.signal };
  return FALLBACK_MODELS.has(access.model)
    ? client.beta.messages.create(
        {
          ...base,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { format: betaZodOutputFormat(request.schema) },
        },
        options,
      )
    : client.messages.create(
        { ...base, output_config: { format: zodOutputFormat(request.schema) } },
        options,
      );
}

async function askClaude<T>(
  access: AiAccess,
  request: AiRequest<T>,
  fetch: typeof globalThis.fetch,
): Promise<AiResult<T>> {
  const response = await sendToClaude(access, request, fetch);
  // Check the stop reason before the content: a refusal has no valid answer.
  if (response.stop_reason === "refusal") return { kind: "refused" };
  // The answer can also have thinking blocks. Only the text blocks hold the JSON.
  const text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  const answer = parseAnswer(request.schema, text);
  if (answer.kind === "bad-answer") return answer;
  return {
    kind: "ok",
    data: answer.data,
    reply: reply(text),
    // After a fallback, another model answered. Its price counts.
    usage: claudeUsage(response.model, response.usage),
  };
}

async function askOpenAi<T>(
  access: AiAccess,
  request: AiRequest<T>,
  fetch: typeof globalThis.fetch,
): Promise<AiResult<T>> {
  const client = new OpenAI({ apiKey: access.apiKey, fetch, ...BROWSER_OPTIONS });
  const response = await client.responses.create(
    {
      model: access.model,
      instructions: request.instructions,
      // OpenAI keeps the start of the conversation in its cache without an extra field.
      input: request.messages.map((message) =>
        message.role === "user"
          ? {
              role: "user" as const,
              content: [
                ...(message.images ?? []).map((image) => ({
                  type: "input_image" as const,
                  image_url: `data:${image.mediaType};base64,${image.base64}`,
                  detail: "auto" as const,
                })),
                { type: "input_text" as const, text: message.text },
              ],
            }
          : { role: "assistant" as const, content: message.text },
      ),
      text: { format: zodTextFormat(request.schema, "answer") },
    },
    { signal: request.signal },
  );
  const refused = response.output.some(
    (item) => item.type === "message" && item.content.some((part) => part.type === "refusal"),
  );
  if (refused) return { kind: "refused" };
  const answer = parseAnswer(request.schema, response.output_text);
  if (answer.kind === "bad-answer") return answer;
  return {
    kind: "ok",
    data: answer.data,
    reply: reply(response.output_text),
    // The input tokens of OpenAI include the tokens from the cache. The price is not known.
    usage: {
      inputTokens: response.usage?.input_tokens ?? 0,
      cachedTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      costUsd: null,
    },
  };
}

/** The kind of a failed request, from the typed errors of both SDKs. */
function failure(error: unknown): AiFailure {
  if (error instanceof Anthropic.APIUserAbortError || error instanceof OpenAI.APIUserAbortError) {
    return { kind: "canceled" };
  }
  if (error instanceof Anthropic.APIConnectionError || error instanceof OpenAI.APIConnectionError) {
    return { kind: "offline" };
  }
  if (error instanceof OpenAI.APIError && error.code === "insufficient_quota") {
    return { kind: "no-credit" };
  }
  if (error instanceof Anthropic.APIError || error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 401:
        return { kind: "invalid-key" };
      case 402:
        return { kind: "no-credit" };
      case 403:
        return { kind: "no-permission" };
      case 429:
        return { kind: "rate-limit" };
      case 503:
      case 529:
        return { kind: "overloaded" };
    }
  }
  return { kind: "error", message: errorText(error) };
}

const PROVIDERS: Record<
  AiProvider,
  <T>(
    access: AiAccess,
    request: AiRequest<T>,
    fetch: typeof globalThis.fetch,
  ) => Promise<AiResult<T>>
> = {
  anthropic: askClaude,
  openai: askOpenAi,
};

/**
 * Sends one request to the AI of the user and returns the parsed answer. It never throws.
 * Send only the data that the feature needs. Tell the user which data goes to the provider.
 */
export async function askAi<T>(
  access: AiAccess,
  request: AiRequest<T>,
  // A wrapper: the SDKs must call the fetch of the browser with the right `this`.
  fetch: typeof globalThis.fetch = (input, init) => globalThis.fetch(input, init),
): Promise<AiResult<T>> {
  try {
    return await PROVIDERS[access.provider](access, request, fetch);
  } catch (error) {
    return failure(error);
  }
}

/** A failed request as a German sentence. */
export function aiMessage(result: AiFailure): string {
  switch (result.kind) {
    case "invalid-key":
      return "Der API-Key ist ungültig oder abgelaufen. Trage unter „KI einrichten“ einen neuen Key ein.";
    case "no-permission":
      return "Der API-Key darf dieses Modell nicht nutzen. Wähle unter „KI einrichten“ ein anderes Modell.";
    case "no-credit":
      return "Dein Guthaben beim Anbieter ist aufgebraucht, oder das Ausgabelimit ist erreicht.";
    case "rate-limit":
      return "Zu viele Anfragen in kurzer Zeit. Versuche es in einer Minute noch einmal.";
    case "overloaded":
      return "Der Anbieter ist gerade überlastet. Versuche es gleich noch einmal.";
    case "offline":
      return "Keine Verbindung zur KI. Prüfe deine Internetverbindung.";
    case "canceled":
      return "Die Anfrage wurde abgebrochen.";
    case "refused":
      return "Die KI hat die Anfrage abgelehnt.";
    case "bad-answer":
      return "Die Antwort der KI hatte nicht das erwartete Format. Versuche es noch einmal.";
    case "error":
      return `Die Anfrage an die KI ist fehlgeschlagen: ${result.message}`;
  }
}
