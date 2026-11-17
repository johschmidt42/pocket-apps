import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "@pocket-apps/ui/charts";
import { ChartContainer } from "@pocket-apps/ui/components/chart";
import { progressPoints } from "./progress.ts";
import type { Result } from "./schema.ts";

export type ProgressChartProps = {
  /** The results of one workout, in any order. */
  results: readonly Result[];
  /** The color of the line, a CSS variable such as "var(--chart-1)". */
  color: string;
};

/**
 * The results over time. Up is better: a faster time is higher. Each point shows its score
 * as text. Results that the chart cannot compare (for example a capped result next to
 * times) are left out.
 */
export function ProgressChart({ results, color }: ProgressChartProps) {
  const progress = progressPoints(results);
  if (progress === null) return null;

  return (
    <div className="flex flex-col gap-2">
      <ChartContainer config={{}} className="aspect-auto h-52 w-full">
        <LineChart data={progress.points} margin={{ top: 28, right: 32, bottom: 0, left: 32 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis hide reversed={progress.lowerIsBetter} domain={["dataMin", "dataMax"]} />
          <Line
            dataKey="value"
            type="monotone"
            stroke={color}
            strokeWidth={2.5}
            dot={({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
              // Rx or no mark: a filled point. Scaled: a hollow point.
              const scaled = progress.points[index ?? 0]?.division === "scaled";
              return (
                <circle
                  key={`dot-${String(index)}`}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill={scaled ? "var(--card)" : color}
                  stroke={color}
                  strokeWidth={2}
                />
              );
            }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="label"
              position="top"
              offset={10}
              className="fill-foreground text-xs font-semibold"
            />
          </Line>
        </LineChart>
      </ChartContainer>
      {progress.points.some((point) => point.division !== null) && (
        <p className="flex justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-foreground" />
            Rx
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-foreground" />
            Scaled
          </span>
        </p>
      )}
    </div>
  );
}
