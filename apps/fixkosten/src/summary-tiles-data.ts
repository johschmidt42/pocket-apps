import type { Summary } from "./budget.ts";
import { formatEuro, type Period } from "./money.ts";

export type SummaryTile = { label: string; value: string; note: string | null };

/** The tiles above the charts: costs, then income and rest (only with income), then the reserve. */
export function summaryTiles(summary: Summary, period: Period): SummaryTile[] {
  const per = period === "month" ? "pro Monat" : "pro Jahr";
  const tiles: SummaryTile[] = [
    { label: `Fixkosten ${per}`, value: formatEuro(summary.costs), note: null },
  ];
  if (summary.remaining !== null) {
    const share = Math.round((summary.costs / summary.incomes) * 100);
    tiles.push({
      label: `Einkommen ${per}`,
      value: formatEuro(summary.incomes),
      note: `Fixkosten: ${String(share)} % davon`,
    });
    tiles.push(
      summary.remaining >= 0
        ? { label: `Übrig ${per}`, value: formatEuro(summary.remaining), note: null }
        : {
            label: `Fehlbetrag ${per}`,
            value: formatEuro(-summary.remaining),
            note: "Die Fixkosten sind höher als das Einkommen.",
          },
    );
  }
  if (summary.reserve > 0) {
    tiles.push({
      label: "Rücklage pro Monat",
      value: formatEuro(summary.reserve),
      note: "für Posten, die nicht monatlich fällig sind",
    });
  }
  return tiles;
}
