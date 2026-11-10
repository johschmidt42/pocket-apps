import { Card, CardContent, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { CATEGORY_INFO, categoryOf } from "./categories.ts";
import { daysBetween, formatCount, formatDays, formatRange } from "./dates.ts";
import type { Holiday, SchoolYear } from "./schema.ts";
import { inSchoolYear, schoolBreaks, schoolDaysUntil } from "./school-days.ts";
import { schoolYearDays } from "./school-years.ts";

/**
 * All holidays of the school year as text, with their dates. The calendar shows them only as
 * colors. During the school year, each coming school holiday shows the school days until it.
 * While the mouse is on an entry, `onHighlight` tells it, so that the calendar can mark its days.
 */
export function HolidayList({
  year,
  today,
  highlight,
  onHighlight,
}: {
  year: SchoolYear;
  today: string;
  highlight: Holiday | null;
  onHighlight: (holiday: Holiday | null) => void;
}) {
  const { first, last } = schoolYearDays(year.startYear);
  const thisYear = (holiday: Holiday) => inSchoolYear(holiday, year.startYear);
  const breaks = schoolBreaks(year.holidays).filter(thisYear);
  const publicHolidays = year.holidays.filter(
    (holiday) => holiday.kind === "public" && thisYear(holiday),
  );
  const running = first <= today && today <= last;

  const item = (holiday: Holiday, withLength: boolean) => (
    <li
      key={holiday.id}
      className={`flex cursor-default flex-wrap items-center gap-x-2 rounded-md px-1 py-1 ${holiday.end < today ? "text-muted-foreground" : ""} ${highlight?.id === holiday.id ? "bg-muted" : ""}`}
      onMouseEnter={() => {
        onHighlight(holiday);
      }}
      onMouseLeave={() => {
        onHighlight(null);
      }}
    >
      <span
        aria-hidden="true"
        className={`size-3 shrink-0 rounded-full ${CATEGORY_INFO[categoryOf(holiday)].dotClass}`}
      />
      <span className="font-medium">{holiday.name}</span>
      <span className="tabular-nums">{formatRange(holiday.start, holiday.end)}</span>
      {withLength && (
        <span className="text-muted-foreground">
          ({formatDays(daysBetween(holiday.start, holiday.end) + 1)})
        </span>
      )}
      {withLength && running && holiday.start > today && (
        <span className="text-muted-foreground">
          · noch{" "}
          {formatCount(schoolDaysUntil(holiday, today, year.holidays), "Schultag", "Schultage")}
        </span>
      )}
    </li>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Ferien und Feiertage</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
        <section aria-labelledby="breaks-heading">
          <h4 id="breaks-heading" className="mb-2 font-medium">
            Ferien und freie Tage
          </h4>
          <ul className="divide-y text-sm">{breaks.map((holiday) => item(holiday, true))}</ul>
        </section>
        <section aria-labelledby="public-heading">
          <h4 id="public-heading" className="mb-2 font-medium">
            Feiertage
          </h4>
          <ul className="divide-y text-sm">
            {publicHolidays.map((holiday) => item(holiday, false))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
