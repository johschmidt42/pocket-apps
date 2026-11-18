import { describe, expect, it } from "vitest";
import { DataFileError } from "../data-file/errors.ts";
import { createMemoryFolder } from "../data-file/testing.ts";
import { AI_FILE, readAiSettings, writeAiSettings } from "./ai-file.ts";
import { initialAiSettings, type AiSettings } from "./settings.ts";

const SETTINGS: AiSettings = {
  active: "anthropic",
  models: { anthropic: "claude-opus-5-5", openai: null },
};

describe("the AI file", () => {
  it("has no provider while the file does not exist", async () => {
    expect(await readAiSettings(createMemoryFolder())).toEqual(initialAiSettings());
  });

  it("writes the settings in an envelope and reads them back", async () => {
    const folder = createMemoryFolder();
    await writeAiSettings(folder, SETTINGS, "3.4");
    const envelope = JSON.parse(folder.files.get(AI_FILE)?.text ?? "") as Record<string, unknown>;
    expect(envelope).toMatchObject({
      app: "ai",
      schemaVersion: 1,
      savedWith: "3.4",
      data: SETTINGS,
    });
    expect(await readAiSettings(folder)).toEqual(SETTINGS);
  });

  it("refuses a broken file", async () => {
    const folder = createMemoryFolder();
    folder.files.set(AI_FILE, { text: "{nope", lastModified: 1 });
    await expect(readAiSettings(folder)).rejects.toBeInstanceOf(DataFileError);
  });
});
