import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import { Card, CardContent } from "@pocket-apps/ui/components/card";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Play } from "lucide-react";
import { ModePicker } from "./mode-picker.tsx";
import { NumberStepper } from "./number-stepper.tsx";
import {
  INTERVAL_UNITS,
  parseSettings,
  type Settings,
  type SettingsField,
  switchIntervalUnit,
} from "./settings.ts";
import { buildTimeline, describeTimer, formatClock, type TimerConfig, workoutMs } from "./timer.ts";

type StepperSpec = {
  field: SettingsField;
  label: string;
  unit: string;
  unitName: string;
  step: number;
  min: number;
  max: number;
  optional?: boolean;
};

const MINUTES = { unit: "min", unitName: "in Minuten", min: 1, max: 180, step: 1 };
const SECONDS = { unit: "s", unitName: "in Sekunden", min: 1, max: 3600 };
const ROUNDS = { unit: "", unitName: "", min: 1, max: 100, step: 1 };

/** The settings of the selected mode. The limits are the same as in `parseSettings()`. */
function steppersFor(settings: Settings): StepperSpec[] {
  switch (settings.mode) {
    case "for-time":
      return [{ field: "capMinutes", label: "Time Cap", ...MINUTES, optional: true }];
    case "amrap":
      return [{ field: "amrapMinutes", label: "Dauer", ...MINUTES }];
    case "emom":
      return [
        settings.emomUnit === "min"
          ? { field: "emomInterval", label: "Intervall", ...MINUTES, max: 60 }
          : { field: "emomInterval", label: "Intervall", ...SECONDS, step: 15 },
        { field: "emomRounds", label: "Runden", ...ROUNDS },
      ];
    case "tabata":
      return [
        { field: "tabataWork", label: "Arbeit", ...SECONDS, step: 5 },
        { field: "tabataRest", label: "Pause", ...SECONDS, step: 5 },
        { field: "tabataRounds", label: "Runden", ...ROUNDS },
      ];
  }
}

const LEAD_IN: StepperSpec = {
  field: "leadIn",
  label: "Vorlauf",
  unit: "s",
  unitName: "in Sekunden",
  step: 5,
  min: 0,
  max: 60,
};

/** The mode, its settings, the lead-in, a summary and the start button. */
export function SetupForm({
  settings,
  onChange,
  onStart,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onStart: (config: TimerConfig) => void;
}) {
  const result = parseSettings(settings);
  const errors = result.ok ? {} : result.errors;

  const stepper = (spec: StepperSpec) => (
    <NumberStepper
      key={spec.field}
      id={spec.field}
      label={spec.label}
      unit={spec.unit}
      unitName={spec.unitName}
      value={settings[spec.field]}
      step={spec.step}
      min={spec.min}
      max={spec.max}
      optional={spec.optional ?? false}
      error={errors[spec.field] ?? null}
      unitSwitch={
        spec.field === "emomInterval" ? (
          <IntervalUnitSwitch settings={settings} onChange={onChange} />
        ) : null
      }
      onChange={(value) => {
        onChange({ ...settings, [spec.field]: value });
      }}
    />
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (result.ok) onStart(result.config);
      }}
    >
      <ModePicker
        mode={settings.mode}
        onChange={(mode) => {
          onChange({ ...settings, mode });
        }}
      />
      <Card className="py-2">
        <CardContent className="flex flex-col divide-y">
          {steppersFor(settings).map(stepper)}
          {stepper(LEAD_IN)}
        </CardContent>
      </Card>
      <div className="flex flex-col items-center gap-5 pt-2">
        {result.ok ? (
          <Summary config={result.config} />
        ) : (
          <p className="text-sm text-muted-foreground">Bitte prüfe die Eingaben.</p>
        )}
        <Button
          type="submit"
          className="size-28 flex-col gap-1 rounded-full text-lg shadow-lg"
          disabled={!result.ok}
        >
          <Play aria-hidden="true" className="size-8 fill-current" />
          Start
        </Button>
      </div>
    </form>
  );
}

/** EMOM: the interval in minutes or in seconds. */
function IntervalUnitSwitch({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Einheit des Intervalls"
      value={settings.emomUnit}
      onValueChange={(value) => {
        // A click on the selected unit gives "": the unit stays.
        if (isOneOf(INTERVAL_UNITS, value)) onChange(switchIntervalUnit(settings, value));
      }}
    >
      <ToggleGroupItem
        value="min"
        aria-label="Minuten"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
      >
        min
      </ToggleGroupItem>
      <ToggleGroupItem
        value="s"
        aria-label="Sekunden"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
      >
        s
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** The length of the timer, large, and its name with the lead-in. */
function Summary({ config }: { config: TimerConfig }) {
  const timeline = buildTimeline(config);
  const big =
    timeline.endMs === null ? "∞" : formatClock(Math.round(workoutMs(timeline, Infinity) / 1000));
  const leadIn =
    config.leadInSeconds === 0 ? "ohne Vorlauf" : `${String(config.leadInSeconds)} s Vorlauf`;
  const name = timeline.endMs === null ? "For Time · ohne Time Cap" : describeTimer(config);
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-5xl font-bold tracking-tight tabular-nums">{big}</p>
      <p className="text-sm text-muted-foreground">
        {name} · {leadIn}
      </p>
    </div>
  );
}
