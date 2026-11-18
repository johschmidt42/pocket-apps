import { z } from "zod";

/** The AI providers that the apps can use. */
export const AI_PROVIDERS = ["anthropic", "openai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Claude (Anthropic)",
  openai: "OpenAI",
};

/** An example of the start of a key, for the empty input. */
export const AI_KEY_PLACEHOLDERS: Record<AiProvider, string> = {
  anthropic: "sk-ant-…",
  openai: "sk-…",
};

/** Where the user creates a key for the provider. */
export const AI_KEY_PAGES: Record<AiProvider, string> = {
  anthropic: "https://platform.claude.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
};

/**
 * The AI settings in the data folder (`ai/ai.json`). They sync to other computers with the
 * folder. They have no API key: the key stays in the browser (see `ai-keys.ts`).
 */
export const aiSettingsSchema = z.object({
  /** The provider that the apps use. `null`: the apps use no AI. */
  active: z.enum(AI_PROVIDERS).nullable(),
  /** The model for each provider. `null`: not chosen yet. */
  models: z.object({
    anthropic: z.string().min(1).nullable(),
    openai: z.string().min(1).nullable(),
  }),
});

export type AiSettings = z.infer<typeof aiSettingsSchema>;

/** The API key for each provider in this browser. `null`: no key on this computer. */
export type AiKeys = Record<AiProvider, string | null>;

/** The AI setup on this computer: the settings from the data folder and the keys of the browser. */
export type AiSetup = { settings: AiSettings; keys: AiKeys };

/** The access that an app uses for a request. */
export type AiAccess = { provider: AiProvider; apiKey: string; model: string };

/** No provider yet. */
export function initialAiSettings(): AiSettings {
  return { active: null, models: { anthropic: null, openai: null } };
}

/** No key in this browser yet. */
export function noAiKeys(): AiKeys {
  return { anthropic: null, openai: null };
}

/**
 * The provider, key and model that the apps use. `null` if the user set up no AI, or if this
 * computer has no key for the active provider.
 */
export function activeAccess(setup: AiSetup): AiAccess | null {
  const provider = setup.settings.active;
  if (provider === null) return null;
  const apiKey = setup.keys[provider];
  const model = setup.settings.models[provider];
  return apiKey === null || model === null ? null : { provider, apiKey, model };
}

/** Saves the key and the model of a provider and makes it the active provider. */
export function withAccess(setup: AiSetup, access: AiAccess): AiSetup {
  const { provider, apiKey, model } = access;
  return {
    settings: {
      active: provider,
      models: { ...setup.settings.models, [provider]: model },
    },
    keys: { ...setup.keys, [provider]: apiKey },
  };
}

/** Removes the key of a provider from this browser. The settings in the data folder stay. */
export function withoutKey(setup: AiSetup, provider: AiProvider): AiSetup {
  return { settings: setup.settings, keys: { ...setup.keys, [provider]: null } };
}

/** The model that the dialog selects after a check. Claude: Claude Opus 5.5, if the key has it. */
export function preferredModel(
  provider: AiProvider,
  models: readonly { id: string }[],
): string | null {
  if (provider === "anthropic" && models.some((model) => model.id === "claude-opus-5-5")) {
    return "claude-opus-5-5";
  }
  return models[0]?.id ?? null;
}
