import { isOneOf } from "@pocket-apps/core/one-of";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { AlarmClock, Repeat, Timer, Zap } from "lucide-react";
import { MODES, type Mode } from "./timer.ts";

const MODE_INFO = {
  "for-time": { name: "For Time", hint: "So schnell wie möglich", Icon: Timer },
  amrap: { name: "AMRAP", hint: "So viele Runden wie möglich", Icon: Repeat },
  emom: { name: "EMOM", hint: "Jede Minute eine Runde", Icon: AlarmClock },
  tabata: { name: "Tabata", hint: "Arbeit und Pause im Wechsel", Icon: Zap },
} as const;

/** The four modes as large tiles, two in a row. */
export function ModePicker({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Modus"
      value={mode}
      onValueChange={(value) => {
        // A click on the selected tile gives "": the mode stays.
        if (isOneOf(MODES, value)) onChange(value);
      }}
      className="grid w-full grid-cols-2 gap-2"
    >
      {MODES.map((value) => {
        const { name, hint, Icon } = MODE_INFO[value];
        return (
          <ToggleGroupItem
            key={value}
            value={value}
            className="h-auto flex-col items-start justify-start gap-1 self-stretch rounded-2xl p-3 text-left whitespace-normal data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
          >
            <Icon aria-hidden="true" className="mb-1 size-5" />
            <span className="text-base font-semibold">{name}</span>
            <span className="text-xs font-normal text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground/75">
              {hint}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
