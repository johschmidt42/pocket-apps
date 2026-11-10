import type { FetchJson } from "@pocket-apps/core/fetch-json";
import { Alert, AlertDescription, AlertTitle } from "@pocket-apps/ui/components/alert";
import { useState } from "react";
import { HolidayList } from "./holiday-list.tsx";
import { loadMessage } from "./load-message.ts";
import { loadSchoolYear } from "./open-holidays.ts";
import { useDataFile, type Holiday, type Selection } from "./schema.ts";
import { schoolYearLabel } from "./school-years.ts";
import { SetupCard } from "./setup-card.tsx";
import { stateName } from "./states.ts";
import { TodaySummary } from "./today-summary.tsx";
import { YearCalendar } from "./year-calendar.tsx";
import { YearToolbar } from "./year-toolbar.tsx";
import { findYear, storedYears, storeAndSelect } from "./years.ts";

export type SchuljahrViewProps = { fetchJson: FetchJson; today: string };

/** The school year on the screen, or the first choice. Use it only inside `DataFileProvider`. */
export function SchuljahrView({ fetchJson, today }: SchuljahrViewProps) {
  const { data, update } = useDataFile();
  const [loading, setLoading] = useState<Selection | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The holiday under the mouse, in the list or in the calendar. Both mark it. */
  const [highlight, setHighlight] = useState<Holiday | null>(null);

  /** Loads a school year from OpenHolidays, stores it and shows it. */
  async function load(selection: Selection): Promise<void> {
    setError(null);
    setLoading(selection);
    const result = await loadSchoolYear(fetchJson, selection, new Date());
    setLoading(null);
    if (result.kind === "ok") {
      update((current) => storeAndSelect(current, result.year));
    } else {
      setError(loadMessage(result, selection));
    }
  }

  /** Shows a school year. It loads the school year only if the data file does not have it. */
  function show(selection: Selection): void {
    if (findYear(data, selection)) {
      setError(null);
      update((current) => ({ ...current, selected: selection }));
    } else {
      void load(selection);
    }
  }

  const year = data.selected ? findYear(data, data.selected) : undefined;
  const status = (
    <p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
      {loading &&
        `Lädt die Ferien für ${stateName(loading.state)}, Schuljahr ${schoolYearLabel(loading.startYear)} …`}
    </p>
  );
  const errorAlert = error && (
    <Alert variant="destructive">
      <AlertTitle>Nicht geladen</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  if (!year) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
        <SetupCard today={today} loading={loading !== null} onSubmit={show} />
        {status}
        {errorAlert}
      </main>
    );
  }

  const selection = loading ?? year;
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4">
      <YearToolbar
        selection={selection}
        stored={storedYears(data, selection.state)}
        today={today}
        fetchedAt={year.fetchedAt}
        loading={loading !== null}
        onChange={show}
        onReload={() => void load({ state: year.state, startYear: year.startYear })}
      />
      {status}
      {errorAlert}
      <h2 className="font-heading text-xl font-semibold">
        {stateName(year.state)} · Schuljahr {schoolYearLabel(year.startYear)}
      </h2>
      <TodaySummary year={year} today={today} />
      {/* On wide screens, the list stays next to the calendar while the page scrolls. */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <YearCalendar year={year} today={today} highlight={highlight} onHighlight={setHighlight} />
        <div className="xl:sticky xl:top-4">
          <HolidayList year={year} today={today} highlight={highlight} onHighlight={setHighlight} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Daten:{" "}
        <a className="underline underline-offset-2" href="https://www.openholidaysapi.org/de/">
          OpenHolidays API
        </a>
        , Lizenz ODbL. Ohne Gewähr. Bewegliche Ferientage legt jede Schule selbst fest. Sie fehlen
        hier.
      </p>
    </main>
  );
}
