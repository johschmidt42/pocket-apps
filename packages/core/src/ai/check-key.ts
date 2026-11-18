import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { errorText } from "../error-text.ts";
import type { AiProvider } from "./settings.ts";

/** A model that the key can use. `name` is the display name. */
export type AiModel = { id: string; name: string };

/** The result of a key check. It never throws. */
export type KeyCheck =
  | { kind: "ok"; models: AiModel[] }
  | { kind: "invalid-key" }
  | { kind: "no-permission" }
  | { kind: "offline" }
  | { kind: "error"; message: string };

/**
 * The browser calls the APIs directly, without a server of ours. Both APIs allow this
 * (CORS). The key comes from the user and stays in the browser of the user (IndexedDB).
 * See "AI settings for all apps" in docs/decisions.md.
 */
const BROWSER_OPTIONS = { dangerouslyAllowBrowser: true, maxRetries: 0 } as const;

/** OpenAI lists also models that cannot write text, for example for images or speech. */
const NOT_FOR_TEXT =
  /embedding|tts|whisper|dall-e|image|audio|realtime|transcribe|moderation|search/;

function isTextModel(id: string): boolean {
  return /^(gpt-|chatgpt|o\d)/.test(id) && !NOT_FOR_TEXT.test(id);
}

async function anthropicModels(apiKey: string, fetch: typeof globalThis.fetch): Promise<AiModel[]> {
  const client = new Anthropic({ apiKey, fetch, ...BROWSER_OPTIONS });
  const models: AiModel[] = [];
  // The API gives the newest models first.
  for await (const model of client.models.list()) {
    models.push({ id: model.id, name: model.display_name });
  }
  return models;
}

async function openAiModels(apiKey: string, fetch: typeof globalThis.fetch): Promise<AiModel[]> {
  const client = new OpenAI({ apiKey, fetch, ...BROWSER_OPTIONS });
  const models: { id: string; created: number }[] = [];
  for await (const model of client.models.list()) {
    if (isTextModel(model.id)) models.push({ id: model.id, created: model.created });
  }
  // Newest models first, like at Anthropic.
  return models
    .sort((a, b) => b.created - a.created)
    .map((model) => ({ id: model.id, name: model.id }));
}

function checkError(error: unknown): KeyCheck {
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof OpenAI.AuthenticationError
  ) {
    return { kind: "invalid-key" };
  }
  if (
    error instanceof Anthropic.PermissionDeniedError ||
    error instanceof OpenAI.PermissionDeniedError
  ) {
    return { kind: "no-permission" };
  }
  if (error instanceof Anthropic.APIConnectionError || error instanceof OpenAI.APIConnectionError) {
    return { kind: "offline" };
  }
  return { kind: "error", message: errorText(error) };
}

/** How to list the models of each provider. */
const MODEL_LISTS: Record<
  AiProvider,
  (apiKey: string, fetch: typeof globalThis.fetch) => Promise<AiModel[]>
> = {
  anthropic: anthropicModels,
  openai: openAiModels,
};

/**
 * Checks the key with the list of the models. This costs no tokens. On success, the result
 * has the models that the key can use, newest first.
 */
export async function checkKey(
  provider: AiProvider,
  apiKey: string,
  // A wrapper: the SDKs must call the fetch of the browser with the right `this`.
  fetch: typeof globalThis.fetch = (input, init) => globalThis.fetch(input, init),
): Promise<KeyCheck> {
  try {
    return { kind: "ok", models: await MODEL_LISTS[provider](apiKey.trim(), fetch) };
  } catch (error) {
    return checkError(error);
  }
}

/** The result of a check as a German sentence. */
export function checkMessage(check: Exclude<KeyCheck, { kind: "ok" }>): string {
  switch (check.kind) {
    case "invalid-key":
      return "Der Key ist ungültig. Prüfe, ob du ihn vollständig kopiert hast.";
    case "no-permission":
      return "Der Key hat keine Berechtigung für die Liste der Modelle.";
    case "offline":
      return "Keine Verbindung. Prüfe deine Internetverbindung.";
    case "error":
      return `Die Prüfung ist fehlgeschlagen: ${check.message}`;
  }
}
