import { useEffect, useState } from "react";
import { useOpenFolder } from "../data-file/data-folder-context.ts";
import { DataFileError } from "../data-file/errors.ts";
import { errorText } from "../error-text.ts";
import { readAiSettings, writeAiSettings } from "./ai-file.ts";
import { readAiKeys, writeAiKeys } from "./ai-keys.ts";
import type { AiSetup } from "./settings.ts";

export type AiSettingsState =
  | { status: "no-folder" }
  | { status: "loading" }
  | { status: "ready"; setup: AiSetup }
  | { status: "error"; message: string };

function message(error: unknown): string {
  if (error instanceof DataFileError) return error.message;
  return `Die App kann die KI-Einstellungen nicht lesen: ${errorText(error)}`;
}

/**
 * The AI setup on this computer: the settings in the data folder (`ai/ai.json`) and the keys in
 * the browser. Use it inside the `DataFileProvider` of an app. The hook reads both when it
 * starts. `save()` writes both.
 */
export function useAiSettings(): {
  state: AiSettingsState;
  save: (setup: AiSetup) => Promise<void>;
} {
  const open = useOpenFolder();
  const folder = open?.folder ?? null;
  const [state, setState] = useState<AiSettingsState>(
    open ? { status: "loading" } : { status: "no-folder" },
  );

  // The file lives in the data folder (an external system).
  useEffect(() => {
    if (!folder) return;
    let active = true;
    Promise.all([readAiSettings(folder), readAiKeys()]).then(
      ([settings, keys]) => {
        if (active) setState({ status: "ready", setup: { settings, keys } });
      },
      (error: unknown) => {
        if (active) setState({ status: "error", message: message(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [folder]);

  async function save(setup: AiSetup): Promise<void> {
    if (!open) throw new Error("Es gibt keinen Datenordner.");
    // First the file: its write can fail (no access, a full disk). Then the keys stay as they
    // were, and the browser and the folder agree. Write the file only if it changes. Then
    // removing a key does not touch the file, which other computers use too.
    const before = state.status === "ready" ? state.setup.settings : null;
    if (JSON.stringify(before) !== JSON.stringify(setup.settings)) {
      await writeAiSettings(open.folder, setup.settings, open.appVersion);
    }
    await writeAiKeys(setup.keys);
    setState({ status: "ready", setup });
  }

  return { state: open ? state : { status: "no-folder" }, save };
}
