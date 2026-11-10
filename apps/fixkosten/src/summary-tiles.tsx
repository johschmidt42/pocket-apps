import { Card, CardContent } from "@pocket-apps/ui/components/card";
import type { Summary } from "./budget.ts";
import type { Period } from "./money.ts";
import { summaryTiles } from "./summary-tiles-data.ts";

/** The key numbers of a profile: costs, income, rest and the monthly reserve. */
export function SummaryTiles({ summary, period }: { summary: Summary; period: Period }) {
  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-2">
      <h2 id="summary-heading" className="sr-only">
        Überblick
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {summaryTiles(summary, period).map((tile) => (
          <Card key={tile.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">{tile.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{tile.value}</p>
              {tile.note && <p className="text-xs text-muted-foreground">{tile.note}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
