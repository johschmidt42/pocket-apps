import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "@pocket-apps/ui/charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@pocket-apps/ui/components/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@pocket-apps/ui/components/table";
import { etfColor } from "./colors.ts";
import { formatChange, formatDay } from "./format.ts";
import { averageReturn, yearlyReturns } from "./returns.ts";
import type { PricePoint } from "./schema.ts";

export type ReturnsSeries = {
  id: string;
  index: number;
  name: string;
  points: readonly PricePoint[];
};

/** The chart shows the newest years. The table shows all years. */
const CHART_YEARS = 10;

/** The return of each ETF per calendar year, and the average per year since the start of its data. */
export function ReturnsCard({ series, today }: { series: readonly ReturnsSeries[]; today: Date }) {
  const key = (index: number) => `etf${String(index)}`;
  const config: ChartConfig = Object.fromEntries(
    series.map((item) => [
      key(item.index),
      { label: item.name, color: etfColor(item.index).color },
    ]),
  );
  const perEtf = series.map((item) => ({
    ...item,
    years: new Map(yearlyReturns(item.points, today).map((entry) => [entry.year, entry])),
    average: averageReturn(item.points),
  }));
  const years = [...new Set(perEtf.flatMap((item) => [...item.years.keys()]))].sort(
    (a, b) => b - a,
  );
  const rows = years
    .slice(0, CHART_YEARS)
    .reverse()
    .map((year) => ({
      // The axis marks a year that is not complete for one of the ETFs.
      year: perEtf.some((item) => item.years.get(year)?.partial)
        ? `${String(year)}*`
        : String(year),
      ...Object.fromEntries(
        perEtf.flatMap((item) => {
          const entry = item.years.get(year);
          return entry ? [[key(item.index), entry.change * 100]] : [];
        }),
      ),
    }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Rendite pro Jahr</h3>
        </CardTitle>
        <CardDescription>
          Die Veränderung in jedem Kalenderjahr, vom Schluss des Vorjahres bis zum Schluss des
          Jahres.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value: number) => formatChange(value / 100)}
            />
            <ReferenceLine y={0} className="stroke-muted-foreground" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full justify-between gap-4">
                      <span className="text-muted-foreground">{config[String(name)]?.label}</span>
                      <span className="font-medium tabular-nums">
                        {formatChange(Number(value) / 100)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-1" />} />
            {perEtf.map((item) => (
              <Bar
                key={item.id}
                dataKey={key(item.index)}
                fill={etfColor(item.index).color}
                radius={2}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jahr</TableHead>
                {perEtf.map((item) => (
                  <TableHead key={item.id} className="max-w-40 text-right whitespace-normal">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${etfColor(item.index).swatchClass}`}
                      />
                      {item.name}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((year) => (
                <TableRow key={year}>
                  <TableHead scope="row">{year}</TableHead>
                  {perEtf.map((item) => {
                    const entry = item.years.get(year);
                    return (
                      <TableCell key={item.id} className="text-right tabular-nums">
                        {entry ? (
                          <>
                            {formatChange(entry.change)}
                            {entry.partial && (
                              <>
                                <span aria-hidden="true"> *</span>
                                <span className="sr-only"> (Jahr nicht vollständig)</span>
                              </>
                            )}
                          </>
                        ) : (
                          "–"
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableHead scope="row">Ø pro Jahr</TableHead>
                {perEtf.map((item) => (
                  <TableCell key={item.id} className="text-right tabular-nums">
                    {item.average ? (
                      <span className="flex flex-col items-end">
                        <span>{formatChange(item.average.rate)}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          seit {formatDay(item.average.since)}
                        </span>
                      </span>
                    ) : (
                      "–"
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          * Jahr nicht vollständig: das erste Jahr mit Kursen oder das laufende Jahr. Eine Woche
          über den Jahreswechsel zählt zum neuen Jahr.
        </p>
      </CardContent>
    </Card>
  );
}
