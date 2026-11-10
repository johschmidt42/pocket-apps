import { Treemap } from "@pocket-apps/ui/charts";
import { ChartContainer } from "@pocket-apps/ui/components/chart";
import type { CategoryTotal } from "./budget.ts";
import { CATEGORY_INFO } from "./categories.ts";
import { CategoryLegend } from "./category-legend.tsx";
import { amountPer, formatEuro, formatEuroShort, type Period } from "./money.ts";
import type { Cost } from "./schema.ts";

export type TilesChartProps = { totals: readonly CategoryTotal[]; period: Period };

/** A treemap: one tile per cost. The area is the amount. Tiles of one category are together. */
export function TilesChart({ totals, period }: TilesChartProps) {
  const costs = new Map<string, Cost>(
    totals.flatMap((total) => total.costs.map((cost) => [cost.id, cost])),
  );
  const data = totals.map((total) => ({
    name: CATEGORY_INFO[total.category].label,
    children: total.costs.map((cost) => ({
      id: cost.id,
      name: cost.name,
      size: amountPer(cost, period),
    })),
  }));

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer config={{}} className="aspect-auto h-96 w-full">
        <Treemap
          data={data}
          dataKey="size"
          isAnimationActive={false}
          content={(node) => {
            const cost = typeof node.id === "string" ? costs.get(node.id) : undefined;
            if (!cost) return <g />;
            const color = CATEGORY_INFO[cost.category].color;
            // About 7 px per letter at text-xs. Show the label only if it fits.
            const fits = node.height > 44 && cost.name.length * 7 + 16 < node.width;
            return (
              <g>
                {/* A light tile with a strong top edge. Then the text is readable on all colors. */}
                <rect
                  x={node.x + 1}
                  y={node.y + 1}
                  width={Math.max(0, node.width - 2)}
                  height={Math.max(0, node.height - 2)}
                  rx={4}
                  fill={color}
                  fillOpacity={0.22}
                />
                <rect
                  x={node.x + 1}
                  y={node.y + 1}
                  width={Math.max(0, node.width - 2)}
                  height={Math.min(4, Math.max(0, node.height - 2))}
                  rx={2}
                  fill={color}
                />
                {fits && (
                  <>
                    <text
                      x={node.x + 8}
                      y={node.y + 22}
                      className="fill-foreground text-xs font-medium"
                    >
                      {cost.name}
                    </text>
                    <text x={node.x + 8} y={node.y + 38} className="fill-muted-foreground text-xs">
                      {formatEuroShort(node.value)}
                    </text>
                  </>
                )}
                <title>{`${cost.name}: ${formatEuro(node.value)}`}</title>
              </g>
            );
          }}
        />
      </ChartContainer>
      <CategoryLegend categories={totals.map((total) => total.category)} />
    </div>
  );
}
