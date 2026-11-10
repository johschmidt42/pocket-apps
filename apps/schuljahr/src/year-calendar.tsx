import { Card, CardContent, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pocket-apps/ui/components/tooltip";
import {
  DayPicker,
  de,
  type ClassNames,
  type DayProps,
  type Matcher,
} from "@pocket-apps/ui/day-picker";
import { createContext, use, type HTMLAttributes } from "react";
import { CATEGORIES, CATEGORY_INFO, type Category } from "./categories.ts";
import { eachDay, formatDay, formatLongDay, localIsoDate, toLocalDate } from "./dates.ts";
import type { Holiday, SchoolYear } from "./schema.ts";
import { calendarMonths, describeDay, holidayText } from "./school-days.ts";
import { schoolYearDays } from "./school-years.ts";

const CLASS_NAMES: Partial<ClassNames> = {
  root: "w-full",
  months: "grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3",
  month: "flex flex-col gap-2",
  month_caption: "font-heading text-sm font-medium",
  month_grid: "w-full border-collapse",
  weekday: "pb-1 text-xs font-normal text-muted-foreground",
  day: "h-8 cursor-default rounded-md p-0 text-center text-sm tabular-nums",
  // Today: a frame in the text color (black or white), because each chart color already belongs
  // to a kind of holiday. The days before today are pale. Thus the eye finds today at the border.
  // "!": the number is not gray on a weekend, and the frame wins over the frame of a public holiday.
  today: "font-bold text-foreground! ring-2! ring-foreground! ring-inset",
  hidden: "invisible",
};

/** The class of the days of the holiday under the mouse (in the list or in the calendar). */
const HIGHLIGHT_CLASS = "font-semibold outline-2 outline-offset-1 outline-foreground";

/**
 * The month name. DayPicker makes it a live region (`role="status"`), because it changes when the
 * user moves to another month. Here the months never change, and 12 live regions disturb screen
 * readers and the save status of the data file. Thus the month name is plain text.
 */
function MonthName({ className, children }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={className}>{children}</span>;
}

/**
 * What `DayCell` needs beyond the day: the tooltip texts by ISO day, and the function that tells
 * the day under the mouse. DayPicker gives `DayCell` only the day and its modifiers.
 */
const DayContext = createContext<{
  texts: ReadonlyMap<string, string>;
  onHover: (date: string | null) => void;
}>({ texts: new Map(), onHover: () => undefined });

/**
 * A day of the calendar. A visible day with holidays shows their names in a tooltip. While the
 * mouse is on it, the calendar and the list mark its holiday.
 */
function DayCell({ day, modifiers, ...props }: DayProps) {
  const { texts, onHover } = use(DayContext);
  const text = texts.get(day.isoDate);
  // A hidden cell is a day of the next or the last month. It is empty and has no tooltip.
  if (text === undefined || modifiers.hidden) return <td {...props} />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <td
          {...props}
          onMouseEnter={() => {
            onHover(day.isoDate);
          }}
          onMouseLeave={() => {
            onHover(null);
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        {formatDay(day.isoDate)}: {text}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The months of the school year with school days. Each free day has the color of its kind.
 * `highlight` marks the days of one holiday: the holiday under the mouse in the list or in the
 * calendar. `onHighlight` tells the holiday of the day under the mouse.
 */
export function YearCalendar({
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
  const days = eachDay(first, last).map((date) => describeDay(date, year.holidays));
  const texts = new Map(
    days.filter((day) => day.holidays.length > 0).map((day) => [day.date, holidayText(day)]),
  );
  const mainHolidays = new Map(days.map((day) => [day.date, day.main]));
  const onHover = (date: string | null) => {
    onHighlight(date === null ? null : (mainHolidays.get(date) ?? null));
  };
  const { firstMonth, count } = calendarMonths(year);

  const modifiers: Record<string, Matcher> = {
    weekend: { dayOfWeek: [0, 6] },
    past: { before: toLocalDate(today) },
  };
  const modifiersClassNames: Record<string, string> = {
    weekend: "text-muted-foreground",
    past: "opacity-40",
    highlight: HIGHLIGHT_CLASS,
  };
  const shown: Category[] = [];
  for (const category of CATEGORIES) {
    const dates = days
      .filter((day) => day.category === category)
      .map((day) => toLocalDate(day.date));
    if (dates.length === 0) continue;
    shown.push(category);
    modifiers[category] = dates;
    modifiersClassNames[category] = CATEGORY_INFO[category].dayClass;
  }
  if (highlight) {
    modifiers.highlight = { from: toLocalDate(highlight.start), to: toLocalDate(highlight.end) };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Kalender</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul aria-label="Legende" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm ring-2 ring-foreground ring-inset"
            />
            Heute
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 rounded-sm bg-foreground opacity-20" />
            Vorbei (blass)
          </li>
          {shown.map((category) => (
            <li key={category} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-3 rounded-sm ${CATEGORY_INFO[category].dotClass}`}
              />
              {CATEGORY_INFO[category].label}
            </li>
          ))}
        </ul>
        <DayContext value={{ texts, onHover }}>
          <DayPicker
            locale={de}
            numberOfMonths={count}
            defaultMonth={toLocalDate(firstMonth)}
            startMonth={toLocalDate(firstMonth)}
            endMonth={toLocalDate(last)}
            today={toLocalDate(today)}
            hideNavigation
            disableNavigation
            showOutsideDays={false}
            classNames={CLASS_NAMES}
            components={{ CaptionLabel: MonthName, Day: DayCell }}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            labels={{
              labelGridcell: (date) => {
                const iso = localIsoDate(date);
                const text = texts.get(iso);
                return text ? `${formatLongDay(iso)}, ${text}` : formatLongDay(iso);
              },
            }}
          />
        </DayContext>
      </CardContent>
    </Card>
  );
}
