import { parseNumber } from "@pocket-apps/core/numbers";
import type { Purchase, PurchaseList } from "./schema.ts";

/** A random ID. Works without a secure context, also under file://. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The orders of the list, in the order of the select box. */
export const SORTS = [
  "date-desc",
  "date-asc",
  "price-desc",
  "price-asc",
  "name-asc",
  "name-desc",
] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  "date-desc": "Datum (neueste zuerst)",
  "date-asc": "Datum (älteste zuerst)",
  "price-desc": "Preis (teuerste zuerst)",
  "price-asc": "Preis (günstigste zuerst)",
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
};

const byName = new Intl.Collator("de", { sensitivity: "base", numeric: true });

/** A copy of the list in the order `sort`. Equal values go by name, equal names by day. */
export function sortPurchases(purchases: readonly Purchase[], sort: Sort): Purchase[] {
  const name = (a: Purchase, b: Purchase) =>
    byName.compare(a.name, b.name) || b.date.localeCompare(a.date);
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
      case "name-asc":
        return name(a, b);
      case "name-desc":
        return name(b, a);
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

const dayFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11-20" → "20.11.2026" */
export function formatDate(isoDate: string): string {
  return dayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * A price in euro ("14,99", "14.99", "1.299", "3 €") in cent, or `null` if it is not a price:
 * other characters than digits, points and commas, a negative value or more than 2 decimals.
 */
export function parsePrice(text: string): number | null {
  const plain = text.replace("€", "").trim();
  if (!/^[\d.,]+$/.test(plain)) return null;
  const value = parseNumber(plain);
  if (value === null) return null;
  const cents = Math.round(value * 100);
  return Math.abs(cents - value * 100) < 1e-6 ? cents : null;
}

/** A price in cent as the text of the price field: 1499 → "14,99". */
export function priceText(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** The field for the picture: empty, a Steam app ID, or a text that is neither. */
export type AppIdInput = { kind: "empty" } | { kind: "id"; id: number } | { kind: "invalid" };

/**
 * Reads the field for the picture: a store link ("https://store.steampowered.com/app/1145360/
 * Hades/") or a number ("1145360").
 */
export function parseAppId(text: string): AppIdInput {
  const trimmed = text.trim();
  if (trimmed === "") return { kind: "empty" };
  const match = /\/app\/(\d+)/.exec(trimmed) ?? /^(\d+)$/.exec(trimmed);
  const id = match ? Number(match[1]) : 0;
  return id > 0 && Number.isSafeInteger(id) ? { kind: "id", id } : { kind: "invalid" };
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
