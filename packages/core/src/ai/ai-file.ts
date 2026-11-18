import { serializeEnvelope } from "../data-file/envelope.ts";
import type { DataFolder } from "../data-file/folder.ts";
import { loadData } from "../data-file/migrate.ts";
import { currentVersion, defineDataSchema } from "../data-file/schema.ts";
import { aiSettingsSchema, initialAiSettings, type AiSettings } from "./settings.ts";

/** The AI settings of all apps, in the data folder. Apart from launcher/launcher.json. No API keys. */
export const AI_FILE = "ai/ai.json";

const schema = defineDataSchema<AiSettings>({
  app: "ai",
  validate: aiSettingsSchema,
  initial: initialAiSettings,
  // Version 1 has no migrations. Append new ones at the end. Never change old ones.
  migrations: [],
});

/** The AI settings. No file yet: no provider. A broken file throws a `DataFileError`. */
export async function readAiSettings(folder: DataFolder): Promise<AiSettings> {
  const file = await folder.read(AI_FILE);
  return file ? loadData(file.text, schema).data : schema.initial();
}

/** Writes the AI settings. `appVersion` is the version of the app that writes the file. */
export async function writeAiSettings(
  folder: DataFolder,
  settings: AiSettings,
  appVersion: string,
): Promise<void> {
  await folder.write(
    AI_FILE,
    serializeEnvelope({
      app: schema.app,
      schemaVersion: currentVersion(schema),
      appVersion,
      data: settings,
    }),
  );
}
