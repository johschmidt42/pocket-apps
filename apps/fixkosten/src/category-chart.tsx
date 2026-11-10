import { Bar, BarChart, LabelList, Rectangle, XAxis, YAxis } from "@pocket-apps/ui/charts";
import { ChartContainer } from "@pocket-apps/ui/components/chart";
import { sum, type CategoryTotal } from "./budget.ts";
import { CATEGORY_INFO } from "./categories.ts";
import { chartHeightClass } from "./chart-height.ts";
import { ICONS } from "./icons.ts";
import { formatEuroShort } from "./money.ts";

const LABEL_WIDTH = 170;

/** One bar per category, largest first. Each bar shows its amount and its share. */
export function CategoryChart({ totals }: { totals: readonly CategoryTotal[] }) {
  const all = sum(totals.map((total) => total.amount));
  const rows = totals.map((total) => ({
    category: total.category,
    label: CATEGORY_INFO[total.category].label,
    amount: total.amount,
  }));

  return (
    // The labels need room. In narrow windows, the chart scrolls sideways.
    <div className="overflow-x-auto">
      <ChartContainer
        config={{}}
        className={`aspect-auto w-full min-w-[24rem] ${chartHeightClass(rows.length)}`}
      >
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 112, bottom: 0, left: 0 }}>
          <XAxis type="number" dataKey="amount" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={LABEL_WIDTH}
            axisLine={false}
            tickLine={false}
            tick={(props) => {
              const row = rows[props.index];
              const y = Number(props.y);
              if (!row) return <g />;
              const info = CATEGORY_INFO[row.category];
              const Icon = ICONS[info.icon].icon;
              return (
                <g>
                  <Icon
                    x={4}
                    y={y - 8}
                    width={16}
                    height={16}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                  <text x={26} y={y + 4} className="fill-foreground text-xs">
                    {info.label}
                  </text>
                </g>
              );
            }}
          />
          <Bar
            dataKey="amount"
            radius={4}
            isAnimationActive={false}
            shape={(props) => {
              const row = rows[props.index];
              return (
                <Rectangle
                  {...props}
                  fill={row ? CATEGORY_INFO[row.category].color : "var(--chart-other)"}
                />
              );
            }}
          >
            <LabelList
              dataKey="amount"
              content={(props) => {
                const amount = Number(props.value);
                return (
                  <text
                    x={Number(props.x) + Number(props.width) + 6}
                    y={Number(props.y) + Number(props.height) / 2}
                    dominantBaseline="middle"
                    className="fill-foreground text-xs"
                  >
                    {`${formatEuroShort(amount)} · ${String(Math.round((amount / all) * 100))} %`}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
