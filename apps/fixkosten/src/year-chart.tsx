import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "@pocket-apps/ui/charts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@pocket-apps/ui/components/chart";
import { extraPayments, paymentsPerMonth, sum, totalsByCategory } from "./budget.ts";
import { CATEGORY_INFO } from "./categories.ts";
import { formatEuro, MONTH_LABELS } from "./money.ts";
import type { Cost } from "./schema.ts";

export type YearChartProps = {
  costs: readonly Cost[];
  /** The average costs per month, in cents. */
  average: number;
};

/** The real payments in each month, stacked by category, with a line at the average. */
export function YearChart({ costs, average }: YearChartProps) {
  // The largest category is at the bottom of each bar.
  const used = totalsByCategory(costs, "month").map((total) => total.category);
  const config: ChartConfig = Object.fromEntries(
    used.map((category) => [
      category,
      { label: CATEGORY_INFO[category].label, color: CATEGORY_INFO[category].color },
    ]),
  );
  const rows = paymentsPerMonth(costs).map((row) => ({
    ...row,
    label: MONTH_LABELS[row.month - 1]?.slice(0, 3) ?? "",
  }));

  const monthly = sum(
    costs.filter((cost) => cost.interval === "monthly").map((cost) => cost.amountCents),
  );
  const extras = extraPayments(costs);

  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={config} className="aspect-auto h-96 w-full">
        <BarChart data={rows} margin={{ top: 16, right: 72, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(value: number) => formatEuro(value, true)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{config[String(name)]?.label}</span>
                    <span className="font-medium tabular-nums">{formatEuro(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend
            content={
              <ChartLegendContent className="flex-wrap gap-x-4 gap-y-1 [&>div]:whitespace-nowrap" />
            }
          />
          {used.map((category) => (
            <Bar
              key={category}
              dataKey={category}
              stackId="payments"
              fill={CATEGORY_INFO[category].color}
              className="stroke-card"
              strokeWidth={1}
              isAnimationActive={false}
            />
          ))}
          <ReferenceLine
            y={average}
            className="stroke-foreground"
            strokeDasharray="4 4"
            label={{
              value: `Ø ${formatEuro(average, true)}`,
              position: "right",
              className: "fill-foreground text-xs",
            }}
          />
        </BarChart>
      </ChartContainer>
      <div className="flex flex-col gap-1 text-sm">
        <p>
          Jeden Monat: <span className="font-medium tabular-nums">{formatEuro(monthly)}</span>
        </p>
        {extras.length > 0 && (
          <>
            <p>Dazu kommen:</p>
            <ul className="flex flex-col gap-1 text-muted-foreground">
              {extras.map((extra) => (
                <li key={extra.month}>
                  <span className="font-medium text-foreground">
                    {MONTH_LABELS[extra.month - 1]}:
                  </span>{" "}
                  <span className="tabular-nums">{formatEuro(extra.total)}</span> (
                  {extra.costs.map((cost) => cost.name).join(", ")})
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
