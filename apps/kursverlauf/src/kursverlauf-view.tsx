import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Checkbox } from "@pocket-apps/ui/components/checkbox";
import { Label } from "@pocket-apps/ui/components/label";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { KeyRound, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { AddEtfDialog } from "./add-etf-dialog.tsx";
import { ApiKeyDialog } from "./api-key-dialog.tsx";
import { ApiKeyForm } from "./api-key-form.tsx";
import { ComparisonChart } from "./comparison-chart.tsx";
import { EtfCard } from "./etf-card.tsx";
import type { FetchJson } from "./fetch-json.ts";
import { addEtf, priceStatus, removeEtf } from "./etfs.ts";
import { formatDay, formatFetchedAt } from "./format.ts";
import { refreshableSymbols } from "./load-prices.ts";
import { pointsInRange, RANGE_LABELS, RANGES, withTotals, type Range } from "./ranges.ts";
import { MAX_ETFS, useDataFile } from "./schema.ts";
import { usePriceRefresh } from "./use-price-refresh.ts";

export type KursverlaufViewProps = { fetchJson: FetchJson; gapMs: number };

const isRange = (value: string): value is Range => RANGES.some((range) => range === value);

/** The ETFs with their price charts and a comparison. Use it only inside `DataFileProvider`. */
export function KursverlaufView({ fetchJson, gapMs }: KursverlaufViewProps) {
  const { data, update } = useDataFile();
  const [range, setRange] = useState<Range>("1y");
  const [withDividends, setWithDividends] = useState(false);
  const [dialog, setDialog] = useState<"none" | "add" | "key">("none");
  const { loading, errors, refresh } = usePriceRefresh({ data, update, fetchJson, gapMs });
  const today = new Date();

  if (data.apiKey === "") {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Kostenlosen API-Key eintragen</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApiKeyForm
              initial=""
              onSave={(apiKey) => {
                update((current) => ({ ...current, apiKey }));
              }}
            />
          </CardContent>
        </Card>
      </main>
    );
  }

  const series = data.etfs.map((etf, index) => ({
    etf,
    index,
    points: pointsInRange(data.prices[etf.symbol]?.points ?? [], range, today),
  }));
  const withPoints = series.filter((item) => item.points.length > 0);
  const status = priceStatus(data);
  const refreshable = refreshableSymbols(data, errors, today);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          aria-label="Zeitraum"
          className="flex-wrap"
          value={range}
          onValueChange={(value) => {
            if (isRange(value)) setRange(value);
          }}
        >
          {RANGES.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {RANGE_LABELS[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Kurse aktualisieren"
            disabled={loading.size > 0 || refreshable.length === 0}
            onClick={() => {
              refresh(refreshable);
            }}
          >
            <RefreshCw className={loading.size > 0 ? "animate-spin" : undefined} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="API-Key ändern"
            onClick={() => {
              setDialog("key");
            }}
          >
            <KeyRound />
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="text-xs text-muted-foreground">
        {loading.size > 0
          ? "Lädt die Kurse …"
          : status
            ? `Wochenkurse bis ${formatDay(status.newestDate)} · abgerufen ${formatFetchedAt(status.oldestFetch, today)}`
            : ""}
      </p>

      {data.etfs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Noch keine ETFs</h2>
            </CardTitle>
            <CardDescription>
              Füge deine ETFs mit der ISIN hinzu. Die App lädt dann die Kurse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setDialog("add");
              }}
            >
              <Plus data-icon="inline-start" />
              ETF hinzufügen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {withPoints.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Vergleich</h2>
                </CardTitle>
                <CardDescription>
                  Veränderung seit dem Start des Zeitraums. So siehst du, welcher ETF besser lief.
                  Ausschüttende ETFs zahlen einen Teil der Rendite aus. Mit Ausschüttungen zählt die
                  App diesen Teil dazu.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="with-dividends"
                    checked={withDividends}
                    onCheckedChange={(checked) => {
                      setWithDividends(checked === true);
                    }}
                  />
                  <Label htmlFor="with-dividends">Mit Ausschüttungen</Label>
                </div>
                <ComparisonChart
                  withDividends={withDividends}
                  series={withPoints.map((item) => ({
                    index: item.index,
                    name: item.etf.name,
                    points: withDividends ? withTotals(item.points) : item.points,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          <section aria-labelledby="etfs-heading" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id="etfs-heading" className="text-lg font-semibold">
                Deine ETFs
              </h2>
              <Button
                variant="outline"
                size="sm"
                disabled={data.etfs.length >= MAX_ETFS}
                onClick={() => {
                  setDialog("add");
                }}
              >
                <Plus data-icon="inline-start" />
                ETF hinzufügen
              </Button>
            </div>
            {series.map((item) => (
              <EtfCard
                key={item.etf.id}
                etf={item.etf}
                index={item.index}
                points={item.points}
                rangeLabel={RANGE_LABELS[range]}
                loading={loading.has(item.etf.symbol)}
                error={errors.get(item.etf.symbol) ?? null}
                onRemove={() => {
                  if (!window.confirm(`„${item.etf.name}“ entfernen?`)) return;
                  update((current) => removeEtf(current, item.etf.id));
                }}
              />
            ))}
          </section>
        </>
      )}

      <AddEtfDialog
        open={dialog === "add"}
        existing={data.etfs.map((etf) => etf.symbol)}
        fetchJson={fetchJson}
        onAdd={(etf) => {
          update((current) => addEtf(current, { id: crypto.randomUUID(), ...etf }));
          setDialog("none");
        }}
        onClose={() => {
          setDialog("none");
        }}
      />
      <ApiKeyDialog
        open={dialog === "key"}
        apiKey={data.apiKey}
        onSave={(apiKey) => {
          update((current) => ({ ...current, apiKey }));
          setDialog("none");
        }}
        onClose={() => {
          setDialog("none");
        }}
      />
    </main>
  );
}
