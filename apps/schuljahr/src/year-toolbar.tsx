import { Button } from "@pocket-apps/ui/components/button";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { RefreshCw } from "lucide-react";
import { formatDay, localIsoDate } from "./dates.ts";
import type { Selection } from "./schema.ts";
import { schoolYearLabel, yearChoices } from "./school-years.ts";
import { isStateCode, STATES } from "./states.ts";

/** The state and the school year on the screen, and the button to load them again. */
export function YearToolbar({
  selection,
  stored,
  today,
  fetchedAt,
  loading,
  onChange,
  onReload,
}: {
  selection: Selection;
  /** The start years in the data file for the selected state. */
  stored: readonly number[];
  today: string;
  fetchedAt: string;
  loading: boolean;
  onChange: (selection: Selection) => void;
  onReload: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="state">Bundesland</Label>
        <NativeSelect
          id="state"
          value={selection.state}
          disabled={loading}
          onChange={(event) => {
            const state = event.target.value;
            if (isStateCode(state)) onChange({ ...selection, state });
          }}
        >
          {STATES.map(({ code, name }) => (
            <NativeSelectOption key={code} value={code}>
              {name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="school-year">Schuljahr</Label>
        <NativeSelect
          id="school-year"
          value={String(selection.startYear)}
          disabled={loading}
          onChange={(event) => {
            onChange({ ...selection, startYear: Number(event.target.value) });
          }}
        >
          {yearChoices(today, stored).map((year) => (
            <NativeSelectOption key={year} value={String(year)}>
              {schoolYearLabel(year)}
              {stored.includes(year) ? " · gespeichert" : ""}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button variant="outline" disabled={loading} onClick={onReload}>
        <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
        Neu laden
      </Button>
      <p className="text-xs text-muted-foreground sm:ml-auto">
        Geladen am {formatDay(localIsoDate(new Date(fetchedAt)))}
      </p>
    </div>
  );
}
