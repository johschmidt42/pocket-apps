import { parseNumber } from "@pocket-apps/core/numbers";
import type { Purchase, PurchaseList } from "./schema.ts";

/** A random ID. Works without a secure context, also under file://. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The orders of the list, in the order of the select box. */
export const SORTS = ["date-desc", "date-asc", "price-desc", "price-asc", "name"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  "date-desc": "Datum (neueste zuerst)",
  "date-asc": "Datum (älteste zuerst)",
  "price-desc": "Preis (teuerste zuerst)",
  "price-asc": "Preis (günstigste zuerst)",
  name: "Name (A–Z)",
};

const byName = new Intl.Collator("de", { sensitivity: "base", numeric: true });

/** A copy of the list in the order `sort`. Equal values go by name. */
export function sortPurchases(purchases: readonly Purchase[], sort: Sort): Purchase[] {
  const name = (a: Purchase, b: Purchase) => byName.compare(a.name, b.name);
  const compare = (a: Purchase, b: Purchase): number => {
    switch (sort) {
      case "date-desc":
        return b.date.localeCompare(a.date) || name(a, b);
      case "date-asc":
        return a.date.localeCompare(b.date) || name(a, b);
      case "price-desc":
        return b.priceCents - a.priceCents || name(a, b);
      case "price-asc":
        return a.priceCents - b.priceCents || name(a, b);
      case "name":
        return name(a, b);
    }
  };
  return [...purchases].sort(compare);
}

/** The sum of all prices in cent. */
export function totalCents(purchases: readonly Purchase[]): number {
  return purchases.reduce((sum, purchase) => sum + purchase.priceCents, 0);
}

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

/** "14,99 €" */
export function formatEuro(cents: number): string {
  return euro.format(cents / 100);
}

const day = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11-20" → "20.11.2026" */
export function formatDate(isoDate: string): string {
  return day.format(new Date(`${isoDate}T00:00:00Z`));
}

/** A price in euro ("14,99", "14.99", "3") in cent, or `null` if it is not a price. */
export function parsePrice(text: string): number | null {
  const value = parseNumber(text.replace("€", ""));
  if (value === null || value < 0) return null;
  return Math.round(value * 100);
}

/**
 * The Steam app ID from a store link ("https://store.steampowered.com/app/1145360/Hades/") or a
 * number ("1145360"). `null` for an empty text. `undefined` if the text is neither.
 */
export function parseAppId(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const match = /\/app\/(\d+)/.exec(trimmed) ?? /^(\d+)$/.exec(trimmed);
  const id = match ? Number(match[1]) : 0;
  return id > 0 && Number.isSafeInteger(id) ? id : undefined;
}

/** The wide picture of a game on the server of Steam (460 × 215 px). */
export function pictureUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${String(appId)}/header.jpg`;
}

/** The data of a purchase without its ID: what the dialog gives. */
export type PurchaseInput = Omit<Purchase, "id">;

export function addPurchase(list: PurchaseList, input: PurchaseInput, id: string): PurchaseList {
  return { ...list, purchases: [...list.purchases, { ...input, id }] };
}

export function changePurchase(list: PurchaseList, id: string, input: PurchaseInput): PurchaseList {
  return {
    ...list,
    purchases: list.purchases.map((purchase) => (purchase.id === id ? { ...input, id } : purchase)),
  };
}

export function removePurchase(list: PurchaseList, id: string): PurchaseList {
  return { ...list, purchases: list.purchases.filter((purchase) => purchase.id !== id) };
}
