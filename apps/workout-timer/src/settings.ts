// The inputs of the setup form, and how they become a timer.

import { parseNumber } from "@pocket-apps/core/numbers";
import type { Mode, ModeConfig, TimerConfig } from "./timer.ts";

/** The text of each input, as the user typed it. */
export type Settings = {
  mode: Mode;
  /** The lead-in in seconds, for all modes. 0: no lead-in. */
  leadIn: string;
  /** For Time: the time cap in minutes. Empty: no time cap. */
  capMinutes: string;
  amrapMinutes: string;
  /** EMOM: the interval in `emomUnit`. */
  emomInterval: string;
  emomUnit: IntervalUnit;
  emomRounds: string;
  tabataWork: string;
  tabataRest: string;
  tabataRounds: string;
};

export const INTERVAL_UNITS = ["min", "s"] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

export type SettingsField = Exclude<keyof Settings, "mode" | "emomUnit">;

export const DEFAULT_SETTINGS: Settings = {
  mode: "for-time",
  leadIn: "10",
  capMinutes: "",
  amrapMinutes: "12",
  emomInterval: "1",
  emomUnit: "min",
  emomRounds: "10",
  tabataWork: "20",
  tabataRest: "10",
  tabataRounds: "8",
};

const MAX_MINUTES = 180;
const MAX_SECONDS = 3600;
/** EMOM: at most one hour per interval. */
const MAX_INTERVAL_MINUTES = 60;
const MAX_LEAD_IN_SECONDS = 60;
const MAX_ROUNDS = 100;

type Parsed = { value: number } | { error: string };

function wholeNumber(text: string, min: number, max: number): Parsed {
  const value = parseNumber(text);
  if (value === null || !Number.isInteger(value) || value < min || value > max) {
    return {
      error: `Bitte eine ganze Zahl von ${String(min)} bis ${max.toLocaleString("de-DE")}.`,
    };
  }
  return { value };
}

export type SettingsResult =
  { ok: true; config: TimerConfig } | { ok: false; errors: Partial<Record<SettingsField, string>> };

/** Reads the inputs of the selected mode. Returns the timer, or an error for each wrong input. */
export function parseSettings(settings: Settings): SettingsResult {
  const errors: Partial<Record<SettingsField, string>> = {};
  const read = (field: SettingsField, max: number, min = 1): number => {
    const parsed = wholeNumber(settings[field], min, max);
    if ("error" in parsed) {
      errors[field] = parsed.error;
      return 0;
    }
    return parsed.value;
  };

  const leadInSeconds = read("leadIn", MAX_LEAD_IN_SECONDS, 0);
  const config: TimerConfig = { ...configFor(settings, read), leadInSeconds };
  return Object.keys(errors).length === 0 ? { ok: true, config } : { ok: false, errors };
}

function configFor(
  settings: Settings,
  read: (field: SettingsField, max: number) => number,
): ModeConfig {
  switch (settings.mode) {
    case "for-time":
      return {
        mode: "for-time",
        capSeconds: settings.capMinutes.trim() === "" ? null : read("capMinutes", MAX_MINUTES) * 60,
      };
    case "amrap":
      return { mode: "amrap", seconds: read("amrapMinutes", MAX_MINUTES) * 60 };
    case "emom":
      return {
        mode: "emom",
        intervalSeconds:
          settings.emomUnit === "min"
            ? read("emomInterval", MAX_INTERVAL_MINUTES) * 60
            : read("emomInterval", MAX_SECONDS),
        rounds: read("emomRounds", MAX_ROUNDS),
      };
    case "tabata":
      return {
        mode: "tabata",
        workSeconds: read("tabataWork", MAX_SECONDS),
        restSeconds: read("tabataRest", MAX_SECONDS),
        rounds: read("tabataRounds", MAX_ROUNDS),
      };
  }
}

/**
 * Changes the unit of the EMOM interval and converts its value: 1 min → 60 s, 90 s → 2 min.
 * A value that is not a number stays as it is.
 */
export function switchIntervalUnit(settings: Settings, unit: IntervalUnit): Settings {
  if (unit === settings.emomUnit) return settings;
  const value = parseNumber(settings.emomInterval);
  if (value === null) return { ...settings, emomUnit: unit };
  const converted =
    unit === "s"
      ? Math.min(value * 60, MAX_SECONDS)
      : Math.min(Math.max(1, Math.round(value / 60)), MAX_INTERVAL_MINUTES);
  return { ...settings, emomUnit: unit, emomInterval: String(converted) };
}
