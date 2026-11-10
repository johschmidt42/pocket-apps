import { dividendSummary } from "./dividends.ts";
import { formatDay, formatEuro, formatPercent } from "./format.ts";
import type { Dividend, PricePoint } from "./schema.ts";

export type DividendsBlockProps = {
  dividends: readonly Dividend[];
  /** All points of the ETF. The last close gives the dividend yield. */
  points: readonly PricePoint[];
  today: Date;
};

/** The dividends of a distributing ETF. Shows nothing for an accumulating ETF. */
export function DividendsBlock({ dividends, points, today }: DividendsBlockProps) {
  const summary = dividendSummary(dividends, points, today);
  if (!summary) return null;
  return (
    <section className="flex flex-col gap-3 border-t pt-4">
      <h4 className="font-medium">Ausschüttungen</h4>
      <p className="text-sm">
        Letzte 12 Monate:{" "}
        <span className="font-medium tabular-nums">{formatEuro(summary.last12Months)}</span> je
        Anteil · <span className="tabular-nums">{formatPercent(summary.yield)}</span> vom Kurs
      </p>
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Letzte Ausschüttungen (Woche des Ex-Tags)</p>
          <ul className="flex flex-col gap-0.5 tabular-nums">
            {summary.recent.map((dividend) => (
              <li key={dividend.date} className="flex justify-between gap-4">
                <span>{formatDay(dividend.date)}</span>
                <span>{formatEuro(dividend.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Pro Jahr</p>
          <ul className="flex flex-col gap-0.5 tabular-nums">
            {summary.byYear.map((entry) => (
              <li key={entry.year} className="flex justify-between gap-4">
                <span>{entry.year}</span>
                <span>{formatEuro(entry.sum)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
