import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings, switchIntervalUnit } from "./settings.ts";

describe("parseSettings", () => {
  it("reads For Time without a time cap from an empty input", () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, mode: "for-time", capMinutes: " " })).toEqual({
      ok: true,
      config: { leadInSeconds: 10, mode: "for-time", capSeconds: null },
    });
  });

  it("reads the time cap in minutes", () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, mode: "for-time", capMinutes: "12" })).toEqual({
      ok: true,
      config: { leadInSeconds: 10, mode: "for-time", capSeconds: 720 },
    });
  });

  it("reads AMRAP, EMOM and Tabata with the default values", () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, mode: "amrap" })).toEqual({
      ok: true,
      config: { leadInSeconds: 10, mode: "amrap", seconds: 720 },
    });
    expect(parseSettings({ ...DEFAULT_SETTINGS, mode: "emom" })).toEqual({
      ok: true,
      config: { leadInSeconds: 10, mode: "emom", intervalSeconds: 60, rounds: 10 },
    });
    expect(parseSettings({ ...DEFAULT_SETTINGS, mode: "tabata" })).toEqual({
      ok: true,
      config: { leadInSeconds: 10, mode: "tabata", workSeconds: 20, restSeconds: 10, rounds: 8 },
    });
  });

  it("gives an error for each wrong input of the selected mode", () => {
    const result = parseSettings({
      ...DEFAULT_SETTINGS,
      mode: "tabata",
      tabataWork: "abc",
      tabataRest: "0",
      tabataRounds: "2,5",
      // Another mode: no error.
      amrapMinutes: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        tabataWork: "Bitte eine ganze Zahl von 1 bis 3.600.",
        tabataRest: "Bitte eine ganze Zahl von 1 bis 3.600.",
        tabataRounds: "Bitte eine ganze Zahl von 1 bis 100.",
      },
    });
  });

  it("does not allow more than 180 minutes", () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, mode: "amrap", amrapMinutes: "181" })).toEqual({
      ok: false,
      errors: { amrapMinutes: "Bitte eine ganze Zahl von 1 bis 180." },
    });
  });

  it("reads the EMOM interval in seconds", () => {
    expect(
      parseSettings({ ...DEFAULT_SETTINGS, mode: "emom", emomUnit: "s", emomInterval: "90" }),
    ).toEqual({
      ok: true,
      config: { leadInSeconds: 10, mode: "emom", intervalSeconds: 90, rounds: 10 },
    });
  });

  it("allows no lead-in, but not more than 60 s", () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, leadIn: "0" })).toEqual({
      ok: true,
      config: { leadInSeconds: 0, mode: "for-time", capSeconds: null },
    });
    expect(parseSettings({ ...DEFAULT_SETTINGS, leadIn: "61" })).toEqual({
      ok: false,
      errors: { leadIn: "Bitte eine ganze Zahl von 0 bis 60." },
    });
  });
});

describe("switchIntervalUnit", () => {
  it("converts minutes to seconds and back", () => {
    const seconds = switchIntervalUnit({ ...DEFAULT_SETTINGS, emomInterval: "2" }, "s");
    expect(seconds).toMatchObject({ emomUnit: "s", emomInterval: "120" });

    expect(switchIntervalUnit({ ...seconds, emomInterval: "90" }, "min")).toMatchObject({
      emomUnit: "min",
      emomInterval: "2",
    });
  });

  it("keeps the limits of the new unit", () => {
    expect(
      switchIntervalUnit({ ...DEFAULT_SETTINGS, emomUnit: "s", emomInterval: "10" }, "min"),
    ).toMatchObject({ emomInterval: "1" });
    expect(
      switchIntervalUnit({ ...DEFAULT_SETTINGS, emomUnit: "s", emomInterval: "9999" }, "min"),
    ).toMatchObject({ emomInterval: "60" });
    expect(switchIntervalUnit({ ...DEFAULT_SETTINGS, emomInterval: "99" }, "s")).toMatchObject({
      emomInterval: "3600",
    });
  });

  it("keeps an empty value, and does nothing for the same unit", () => {
    expect(switchIntervalUnit({ ...DEFAULT_SETTINGS, emomInterval: "" }, "s")).toMatchObject({
      emomUnit: "s",
      emomInterval: "",
    });
    expect(switchIntervalUnit(DEFAULT_SETTINGS, "min")).toBe(DEFAULT_SETTINGS);
  });
});
