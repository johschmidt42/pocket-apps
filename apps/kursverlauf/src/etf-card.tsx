import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { TrendingDown, TrendingUp, Trash2 } from "lucide-react";
import { etfColor } from "./colors.ts";
import { formatChange, formatDay, formatEuro } from "./format.ts";
import { PriceChart } from "./price-chart.tsx";
import { rangeStats } from "./ranges.ts";
import { DividendsBlock } from "./dividends-block.tsx";
import type { Dividend, Etf, PricePoint } from "./schema.ts";

export type EtfCardProps = {
  etf: Etf;
  index: number;
  /** The points in the selected range. */
  points: readonly PricePoint[];
  /** All points, for the dividend yield. */
  allPoints: readonly PricePoint[];
  dividends: readonly Dividend[];
  today: Date;
  /** The text of the range, for example "1 Jahr". */
  rangeLabel: string;
  loading: boolean;
  error: string | null;
  onRemove: () => void;
};

/** One ETF: last price, change in the range, high and low, and the price chart. */
export function EtfCard({
  etf,
  index,
  points,
  allPoints,
  dividends,
  today,
  rangeLabel,
  loading,
  error,
  onRemove,
}: EtfCardProps) {
  const stats = rangeStats(points);
  const { color, swatchClass } = etfColor(index);
  const Trend = stats && stats.change < 0 ? TrendingDown : TrendingUp;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${swatchClass}`} />
          <h3 className="wrap-anywhere">{etf.name}</h3>
        </CardTitle>
        <CardDescription>
          {[etf.isin, etf.symbol].filter((part) => part !== "").join(" · ")}
        </CardDescription>
        <CardAction>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`${etf.name} entfernen`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {stats ? (
          <>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  Schlusskurs {formatDay(stats.last.date)}
                </span>
                <span className="text-2xl font-semibold tabular-nums">
                  {formatEuro(stats.last.close)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{rangeLabel}</span>
                <span className="flex items-center gap-1 font-medium tabular-nums">
                  <Trend aria-hidden="true" className="size-4" />
                  {formatChange(stats.change)}
                </span>
              </div>
              <div className="flex flex-col text-xs text-muted-foreground tabular-nums">
                <span>
                  Hoch {formatEuro(stats.high.close)} am {formatDay(stats.high.date)}
                </span>
                <span>
                  Tief {formatEuro(stats.low.close)} am {formatDay(stats.low.date)}
                </span>
              </div>
            </div>
            <PriceChart points={points} color={color} name={etf.name} />
            <DividendsBlock dividends={dividends} points={allPoints} today={today} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {loading ? "Lädt die Kurse …" : "Keine Kurse in diesem Zeitraum."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
