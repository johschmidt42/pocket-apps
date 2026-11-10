import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "@pocket-apps/ui/charts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@pocket-apps/ui/components/chart";
import { etfColor } from "./colors.ts";
import { formatChange, formatDay, formatMonth } from "./format.ts";
import { commonStart, comparisonChanges, comparisonRows } from "./ranges.ts";
import type { PricePoint } from "./schema.ts";

export type ComparisonSeries = {
  id: string;
  index: number;
  name: string;
  points: readonly PricePoint[];
};

/** All ETFs in one chart. Each line starts at 0 % at the first date that all ETFs have. */
export type ComparisonChartProps = {
  series: readonly ComparisonSeries[];
  /** Only for the text below the chart. The caller gives the points with or without dividends. */
  withDividends: boolean;
};

export function ComparisonChart({ series, withDividends }: ComparisonChartProps) {
  const key = (index: number) => `etf${String(index)}`;
  const config: ChartConfig = Object.fromEntries(
    series.map((item) => [
      key(item.index),
      { label: item.name, color: etfColor(item.index).color },
    ]),
  );
  const keyed = series.map((item) => ({ key: key(item.index), points: item.points }));
  const rows = comparisonRows(keyed);
  const start = commonStart(keyed);
  const changes = comparisonChanges(keyed);
  const indexOf = new Map(series.map((item) => [key(item.index), item.index]));

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer config={config} className="aspect-auto h-80 w-full">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tickFormatter={(value: string) => formatMonth(value)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => formatChange(value / 100)}
          />
          <ReferenceLine y={0} className="stroke-muted-foreground" strokeDasharray="4 4" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label: unknown) =>
                  typeof label === "string" ? formatDay(label) : ""
                }
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
          {series.map((item) => (
            <Line
              key={item.id}
              dataKey={key(item.index)}
              type="monotone"
              stroke={etfColor(item.index).color}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      {start && (
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground">
            {`Seit ${formatDay(start)}${withDividends ? ", mit Ausschüttungen" : ""}:`}
          </p>
          <ul className="flex flex-col gap-1">
            {changes.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-full ${etfColor(indexOf.get(item.key) ?? -1).swatchClass}`}
                  />
                  <span className="truncate">{config[item.key]?.label}</span>
                </span>
                <span className="font-medium tabular-nums">{formatChange(item.change)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
