// AI for the apps: the settings in the data folder (`ai/ai.json`), the keys in the browser,
// the dialog to set them up, and the requests to the provider.
// An app uses `useAi()`: `ask()` sends a request and gives a parsed answer.
export { AiDataNotice, type AiDataNoticeProps } from "./ai-data-notice.tsx";
export { AiSettingsDialog, type AiSettingsDialogProps } from "./ai-settings-dialog.tsx";
export { AiSetupNotice, type AiSetupNoticeProps } from "./ai-setup-notice.tsx";
export { aiMessage, type AiFailure, type AiRequest, type AiResult, type AskAi } from "./ask.ts";
export { checkKey, type AiModel, type KeyCheck } from "./check-key.ts";
export { imageForAi, imageMessage, type AiImage, type ImageCheck } from "./images.ts";
export { formatUsage, type AiUsage } from "./pricing.ts";
export {
  activeAccess,
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  type AiAccess,
  type AiKeys,
  type AiProvider,
  type AiSettings,
  type AiSetup,
} from "./settings.ts";
export { TEST_AI, useAi, type AiState } from "./use-ai.ts";
export { useAiSettings, type AiSettingsState } from "./use-ai-settings.ts";
