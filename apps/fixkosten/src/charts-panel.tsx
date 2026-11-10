import { Card, CardContent, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { Checkbox } from "@pocket-apps/ui/components/checkbox";
import { Label } from "@pocket-apps/ui/components/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pocket-apps/ui/components/tabs";
import { useState } from "react";
import { summarize, totalsByCategory } from "./budget.ts";
import { CategoryChart } from "./category-chart.tsx";
import { buildFlow } from "./flow.ts";
import { FlowChart } from "./flow-chart.tsx";
import type { Period } from "./money.ts";
import { isOneOf } from "./one-of.ts";
import type { Profile } from "./schema.ts";
import { TilesChart } from "./tiles-chart.tsx";
import { YearChart } from "./year-chart.tsx";

/** The views of the costs. */
const VIEWS = ["flow", "categories", "tiles", "year"] as const;
type View = (typeof VIEWS)[number];

/** The charts of a profile in tabs. The list of entries below the charts has the same data as text. */
export function ChartsPanel({ profile, period }: { profile: Profile; period: Period }) {
  const [view, setView] = useState<View>("flow");
  const [withCosts, setWithCosts] = useState(true);
  const totals = totalsByCategory(profile.costs, period);
  const flow = buildFlow(profile, period, { withCosts, maxCostNodes: 20 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Diagramme</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={view}
          onValueChange={(value) => {
            if (isOneOf(VIEWS, value)) setView(value);
          }}
          className="flex flex-col gap-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 sm:flex sm:w-fit">
            <TabsTrigger value="flow">Fluss</TabsTrigger>
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="tiles">Kacheln</TabsTrigger>
            <TabsTrigger value="year">Monate</TabsTrigger>
          </TabsList>

          <TabsContent value="flow" className="flex flex-col gap-3">
            <Caption>
              {profile.incomes.length > 0
                ? "So fließt dein Geld: vom Einkommen über die Kategorien zu den einzelnen Posten."
                : "So verteilen sich deine Fixkosten auf die Kategorien und die einzelnen Posten."}
            </Caption>
            <div className="flex items-center gap-2">
              <Checkbox
                id="flow-with-costs"
                checked={withCosts}
                onCheckedChange={(checked) => {
                  setWithCosts(checked === true);
                }}
              />
              <Label htmlFor="flow-with-costs">Einzelne Posten zeigen</Label>
            </div>
            {flow ? <FlowChart flow={flow} /> : <NoData />}
          </TabsContent>

          <TabsContent value="categories" className="flex flex-col gap-3">
            <Caption>Die Kategorien nach Höhe, mit ihrem Anteil an allen Fixkosten.</Caption>
            {totals.length > 0 ? <CategoryChart totals={totals} /> : <NoData />}
          </TabsContent>

          <TabsContent value="tiles" className="flex flex-col gap-3">
            <Caption>
              Jede Kachel ist ein Posten. Je größer die Kachel, desto teurer der Posten.
            </Caption>
            {totals.length > 0 ? <TilesChart totals={totals} period={period} /> : <NoData />}
          </TabsContent>

          <TabsContent value="year" className="flex flex-col gap-3">
            <Caption>
              Die echten Zahlungen in jedem Monat. Die Linie zeigt den Durchschnitt: Diesen Betrag
              solltest du jeden Monat einplanen.
            </Caption>
            {totals.length > 0 ? (
              <YearChart costs={profile.costs} average={summarize(profile, "month").costs} />
            ) : (
              <NoData />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Caption({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function NoData() {
  return <p className="text-sm text-muted-foreground">Noch keine Posten mit einem Betrag.</p>;
}
