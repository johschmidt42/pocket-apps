import { describe, expect, it } from "vitest";
import {
  activeAccess,
  aiSettingsSchema,
  initialAiSettings,
  noAiKeys,
  preferredModel,
  withAccess,
  withoutKey,
  type AiSetup,
} from "./settings.ts";

const EMPTY: AiSetup = { settings: initialAiSettings(), keys: noAiKeys() };

describe("AI settings", () => {
  it("starts without a provider and without keys", () => {
    expect(EMPTY).toEqual({
      settings: { active: null, models: { anthropic: null, openai: null } },
      keys: { anthropic: null, openai: null },
    });
    expect(activeAccess(EMPTY)).toBeNull();
  });

  it("keeps no key in the file", () => {
    expect(
      aiSettingsSchema.safeParse({ active: "openai", models: { anthropic: null, openai: "gpt-x" } })
        .success,
    ).toBe(true);
    expect(
      aiSettingsSchema.parse({
        active: null,
        models: { anthropic: null, openai: null },
        apiKey: "sk-secret",
      }),
    ).toEqual({ active: null, models: { anthropic: null, openai: null } });
    expect(aiSettingsSchema.safeParse({ active: "x", models: {} }).success).toBe(false);
  });

  it("gives the access of the active provider, if this computer has its key", () => {
    const setup = withAccess(EMPTY, { provider: "openai", apiKey: "sk-2", model: "gpt-x" });
    expect(setup).toEqual({
      settings: { active: "openai", models: { anthropic: null, openai: "gpt-x" } },
      keys: { anthropic: null, openai: "sk-2" },
    });
    expect(activeAccess(setup)).toEqual({ provider: "openai", apiKey: "sk-2", model: "gpt-x" });

    // Another computer: the settings came with the folder, but the key is missing.
    expect(activeAccess({ ...setup, keys: noAiKeys() })).toBeNull();
    // The active provider has no model.
    expect(
      activeAccess({
        settings: { ...setup.settings, models: { anthropic: null, openai: null } },
        keys: setup.keys,
      }),
    ).toBeNull();
  });

  it("removes only the key in this browser", () => {
    const setup = withAccess(EMPTY, {
      provider: "anthropic",
      apiKey: "sk-ant",
      model: "claude-opus-5-5",
    });
    expect(withoutKey(setup, "anthropic")).toEqual({ settings: setup.settings, keys: noAiKeys() });
  });

  it("selects Claude Opus 5.5 if the key has it, else the first model", () => {
    expect(preferredModel("anthropic", [{ id: "claude-x" }, { id: "claude-opus-5-5" }])).toBe(
      "claude-opus-5-5",
    );
    expect(preferredModel("anthropic", [{ id: "claude-x" }])).toBe("claude-x");
    expect(preferredModel("openai", [{ id: "gpt-y" }, { id: "claude-opus-5-5" }])).toBe("gpt-y");
    expect(preferredModel("openai", [])).toBeNull();
  });
});
