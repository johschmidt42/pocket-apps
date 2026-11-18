import { askAi, type AskAi } from "./ask.ts";
import { activeAccess, type AiProvider } from "./settings.ts";
import { useAiSettings } from "./use-ai-settings.ts";

/**
 * The AI for an app:
 * - `loading`: the app reads the settings.
 * - `not-set-up`: no data folder, no provider or no key in this browser. Show `AiSetupNotice`.
 * - `ready`: `ask()` sends a request with the provider and the model of the user.
 * - `error`: the settings file is broken.
 */
export type AiState =
  | { status: "loading" }
  | { status: "not-set-up" }
  | { status: "ready"; provider: AiProvider; model: string; ask: AskAi }
  | { status: "error"; message: string };

/** The provider and the model that a fake `ask` in tests reports. */
export const TEST_AI = { provider: "anthropic", model: "claude-test" } as const;

/**
 * The AI of the user for this app. Use it inside `DataFileProvider`. `reload()` reads the
 * settings again (pass it to `AiSetupNotice` as `onClose`). With `fake`, the hook is ready at
 * once and uses the fake: give it in unit tests of the app, like `fetchJson`.
 */
export function useAi(fake?: AskAi): { state: AiState; reload: () => void } {
  const { state, reload } = useAiSettings();
  if (fake) return { state: { status: "ready", ...TEST_AI, ask: fake }, reload };
  switch (state.status) {
    case "no-folder":
      return { state: { status: "not-set-up" }, reload };
    case "loading":
      return { state: { status: "loading" }, reload };
    case "error":
      return { state: { status: "error", message: state.message }, reload };
    case "ready": {
      const access = activeAccess(state.setup);
      if (!access) return { state: { status: "not-set-up" }, reload };
      return {
        state: {
          status: "ready",
          provider: access.provider,
          model: access.model,
          ask: (request) => askAi(access, request),
        },
        reload,
      };
    }
  }
}
