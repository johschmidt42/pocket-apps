// The API keys stay in the browser (IndexedDB), not in the data folder. Then they are not in
// the cloud copy of the folder (for example Google Drive), not in its version history and not
// in shared folders. The user types the key once per computer and per web address.
// See "AI settings for all apps" in docs/decisions.md.
import { indexedDbStore, type KeyValueStore } from "../data-file/browser-folder.ts";
import { AI_PROVIDERS, noAiKeys, type AiKeys, type AiProvider } from "./settings.ts";

function storeKey(provider: AiProvider): string {
  return `ai-key-${provider}`;
}

/** The keys in this browser. A value that is not a text counts as no key. */
export async function readAiKeys(store: KeyValueStore = indexedDbStore): Promise<AiKeys> {
  const keys = noAiKeys();
  for (const provider of AI_PROVIDERS) {
    const value = await store.get(storeKey(provider));
    keys[provider] = typeof value === "string" && value !== "" ? value : null;
  }
  return keys;
}

/** Saves the keys in this browser. `null` removes a key. */
export async function writeAiKeys(
  keys: AiKeys,
  store: KeyValueStore = indexedDbStore,
): Promise<void> {
  for (const provider of AI_PROVIDERS) {
    await store.set(storeKey(provider), keys[provider]);
  }
}
