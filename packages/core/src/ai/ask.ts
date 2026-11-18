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

/** One request to the AI: an instruction, a text, optional images and the shape of the answer. */
export type AiRequest<T> = {
  /** The task and the rules for the AI (system prompt). */
  instructions: string;
  /** The data of the user, for example notes. */
  prompt: string;
  images?: readonly AiImage[];
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

/** The result of a request. It never throws. */
export type AiResult<T> = { kind: "ok"; data: T; usage: AiUsage } | AiFailure;

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

function usage(model: string, inputTokens: number, outputTokens: number): AiUsage {
  return { inputTokens, outputTokens, costUsd: requestCost(model, inputTokens, outputTokens) };
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
  const content = [
    ...(request.images ?? []).map((image) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: image.mediaType, data: image.base64 },
    })),
    { type: "text" as const, text: request.prompt },
  ];
  const base = {
    model: access.model,
    max_tokens: MAX_TOKENS,
    system: request.instructions,
    messages: [{ role: "user" as const, content }],
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
    // After a fallback, another model answered. Its price counts.
    usage: usage(response.model, response.usage.input_tokens, response.usage.output_tokens),
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
      input: [
        {
          role: "user",
          content: [
            ...(request.images ?? []).map((image) => ({
              type: "input_image" as const,
              image_url: `data:${image.mediaType};base64,${image.base64}`,
              detail: "auto" as const,
            })),
            { type: "input_text" as const, text: request.prompt },
          ],
        },
      ],
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
    usage: usage(
      access.model,
      response.usage?.input_tokens ?? 0,
      response.usage?.output_tokens ?? 0,
    ),
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
