import { Card, CardContent, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { Progress } from "@pocket-apps/ui/components/progress";
import type { ReactNode } from "react";
import { daysBetween, formatCount, formatDay, formatDays, formatLongDay } from "./dates.ts";
import type { SchoolYear } from "./schema.ts";
import { describeToday, totals, type Today } from "./school-days.ts";

const schoolDaysText = (count: number) => formatCount(count, "Schultag", "Schultage");

function NumberCard({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h3>{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="font-heading text-3xl font-semibold tabular-nums">{value}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}

function dayStatus({ day, currentBreak }: Extract<Today, { kind: "during" }>): string {
  if (currentBreak) return currentBreak.name;
  if (day.category === "feiertag") return `Feiertag: ${day.names.join(", ")}`;
  return day.weekend ? "Wochenende" : "Schultag";
}

/** The numbers of the school year: today, the next holidays and the school days so far. */
export function TodaySummary({ year, today }: { year: SchoolYear; today: string }) {
  const now = describeToday(year, today);
  const all = totals(year);
  const cards: ReactNode[] = [];

  switch (now.kind) {
    case "before":
      cards.push(
        <NumberCard
          key="start"
          title="Bis zum ersten Schultag"
          value={now.firstSchoolDay ? formatDays(daysBetween(today, now.firstSchoolDay)) : "–"}
        >
          {now.firstSchoolDay
            ? `Erster Schultag: ${formatDay(now.firstSchoolDay)}`
            : "Das Schuljahr hat in diesen Daten keinen Schultag."}
        </NumberCard>,
      );
      break;
    case "after":
      cards.push(
        <NumberCard key="end" title="Vorbei" value="✓">
          Dieses Schuljahr ist vorbei.
        </NumberCard>,
      );
      break;
    case "during": {
      const percent = now.total === 0 ? 0 : Math.round((now.done / now.total) * 100);
      cards.push(
        <NumberCard key="today" title="Heute" value={dayStatus(now)}>
          {formatLongDay(today)}
        </NumberCard>,
      );
      if (now.currentBreak) {
        cards.push(
          <NumberCard
            key="back"
            title="Wieder Schule"
            value={now.nextSchoolDay ? formatDays(daysBetween(today, now.nextSchoolDay)) : "–"}
          >
            {now.nextSchoolDay
              ? `Erster Schultag: ${formatDay(now.nextSchoolDay)}`
              : `Die ${now.currentBreak.name} gehen bis ${formatDay(now.currentBreak.end)}.`}
          </NumberCard>,
        );
      } else if (now.nextBreak) {
        cards.push(
          <NumberCard
            key="next"
            title="Bis zu den nächsten Ferien"
            value={schoolDaysText(now.nextBreak.schoolDays)}
          >
            {now.nextBreak.holiday.name} ab {formatDay(now.nextBreak.holiday.start)}
            {now.day.schoolDay ? ". Heute ist mitgezählt." : "."}
          </NumberCard>,
        );
      }
      if (now.summer) {
        cards.push(
          <NumberCard
            key="summer"
            title="Bis zu den Sommerferien"
            value={schoolDaysText(now.summer.schoolDays)}
          >
            Ab {formatDay(now.summer.holiday.start)}.
          </NumberCard>,
        );
      }
      cards.push(
        <NumberCard key="progress" title="Geschafft" value={`${String(percent)} %`}>
          <p className="mb-2">
            {now.done} von {now.total} Schultagen
          </p>
          <Progress value={percent} aria-label="Geschaffte Schultage" />
        </NumberCard>,
      );
      break;
    }
  }

  cards.push(
    <NumberCard key="totals" title="Im ganzen Schuljahr" value={schoolDaysText(all.schoolDays)}>
      {formatCount(all.holidayDays, "Ferientag", "Ferientage")},{" "}
      {formatCount(all.publicHolidays, "Feiertag", "Feiertage")}
    </NumberCard>,
  );

  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards}</div>;
}
