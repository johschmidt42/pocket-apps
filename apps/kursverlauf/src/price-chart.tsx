import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "@pocket-apps/ui/charts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@pocket-apps/ui/components/chart";
import { formatAxisEuro, formatDay, formatEuro, formatMonth } from "./format.ts";
import type { PricePoint } from "./schema.ts";

export type PriceChartProps = { points: readonly PricePoint[]; color: string; name: string };

/** The price of one ETF in the range, as an area chart. */
export function PriceChart({ points, color, name }: PriceChartProps) {
  const config: ChartConfig = { close: { label: name, color } };

  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <AreaChart data={[...points]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          width={64}
          // Start the axis near the lowest price, at a round value. Else small changes look flat.
          domain={["auto", "auto"]}
          tickFormatter={(value: number) => formatAxisEuro(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(label: unknown) =>
                typeof label === "string" ? formatDay(label) : ""
              }
              formatter={(value) => (
                <span className="font-medium tabular-nums">{formatEuro(Number(value))}</span>
              )}
            />
          }
        />
        <Area
          dataKey="close"
          type="monotone"
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.15}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
