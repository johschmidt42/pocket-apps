import { CATEGORY_INFO } from "./categories.ts";
import type { LucideIcon } from "lucide-react";
import { ICONS } from "./icons.ts";
import {
  amountPer,
  formatEuro,
  INTERVAL_LABELS,
  MONTH_LABELS,
  MONTHS_PER_PAYMENT,
} from "./money.ts";
import { CATEGORIES, type Cost, type Income } from "./schema.ts";

export type EntryRow = {
  id: string;
  name: string;
  /** For example "Wohnen · jährlich im März". */
  detail: string;
  /** The amount as the user entered it, for example "65,00 €". */
  amount: string;
  /** For example "5,42 € pro Monat". `null` for monthly entries. */
  equivalent: string | null;
  icon: LucideIcon;
  /** Tailwind classes for the icon bubble. */
  iconClass: string;
};

/** "monatlich", "jährlich im März" or "vierteljährlich ab Januar". */
function when(entry: Income): string {
  const month = MONTH_LABELS[entry.dueMonth - 1] ?? "";
  switch (entry.interval) {
    case "monthly":
      return INTERVAL_LABELS.monthly;
    case "yearly":
      return `${INTERVAL_LABELS.yearly} im ${month}`;
    case "quarterly":
    case "half-yearly":
      return `${INTERVAL_LABELS[entry.interval]} ab ${month}`;
  }
}

function equivalent(entry: Income): string | null {
  return MONTHS_PER_PAYMENT[entry.interval] === 1
    ? null
    : `${formatEuro(amountPer(entry, "month"))} pro Monat`;
}

/** The costs as list rows: sorted by category, then by amount. */
export function costRows(costs: readonly Cost[]): EntryRow[] {
  return [...costs]
    .sort(
      (a, b) =>
        CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
        amountPer(b, "month") - amountPer(a, "month"),
    )
    .map((cost) => ({
      id: cost.id,
      name: cost.name,
      detail: `${CATEGORY_INFO[cost.category].label} · ${when(cost)}`,
      amount: formatEuro(cost.amountCents),
      equivalent: equivalent(cost),
      icon: ICONS[cost.icon].icon,
      iconClass: CATEGORY_INFO[cost.category].iconClass,
    }));
}

/** The incomes as list rows, in the saved order. */
export function incomeRows(incomes: readonly Income[]): EntryRow[] {
  return incomes.map((income) => ({
    id: income.id,
    name: income.name,
    detail: when(income),
    amount: formatEuro(income.amountCents),
    equivalent: equivalent(income),
    icon: ICONS.wallet.icon,
    iconClass: "bg-muted text-muted-foreground",
  }));
}
