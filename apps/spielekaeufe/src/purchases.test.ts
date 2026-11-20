import { describe, expect, it } from "vitest";
import {
  addPurchase,
  changePurchase,
  formatDate,
  formatEuro,
  newId,
  parseAppId,
  parsePrice,
  pictureUrl,
  priceText,
  removePurchase,
  sortPurchases,
  totalCents,
} from "./purchases.ts";
import type { Purchase } from "./schema.ts";

const hades: Purchase = { id: "h", date: "2024-03-01", name: "Hades", priceCents: 1249, appId: 1 };
const inside: Purchase = { id: "i", date: "2025-01-10", name: "INSIDE", priceCents: 399, appId: 2 };
const doom: Purchase = { id: "d", date: "2024-03-01", name: "doom", priceCents: 1249, appId: 3 };
const list = [hades, inside, doom];

function names(purchases: Purchase[]): string[] {
  return purchases.map((purchase) => purchase.name);
}

describe("sortPurchases", () => {
  it("sorts by date, newest or oldest first, and by name on the same day", () => {
    expect(names(sortPurchases(list, "date-desc"))).toEqual(["INSIDE", "doom", "Hades"]);
    expect(names(sortPurchases(list, "date-asc"))).toEqual(["doom", "Hades", "INSIDE"]);
  });

  it("sorts by price and by name without case", () => {
    expect(names(sortPurchases(list, "price-desc"))).toEqual(["doom", "Hades", "INSIDE"]);
    expect(names(sortPurchases(list, "price-asc"))).toEqual(["INSIDE", "doom", "Hades"]);
    expect(names(sortPurchases(list, "name-asc"))).toEqual(["doom", "Hades", "INSIDE"]);
    expect(names(sortPurchases(list, "name-desc"))).toEqual(["INSIDE", "Hades", "doom"]);
  });

  it("puts the newer purchase first when two have the same name", () => {
    const again = { ...hades, id: "h2", date: "2026-01-01" };
    expect(sortPurchases([hades, again], "name-asc").map((purchase) => purchase.id)).toEqual([
      "h2",
      "h",
    ]);
  });

  it("keeps the list itself", () => {
    sortPurchases(list, "name-asc");
    expect(names(list)).toEqual(["Hades", "INSIDE", "doom"]);
  });
});

describe("money and days", () => {
  it("adds the prices and writes euro and German days", () => {
    expect(totalCents(list)).toBe(2897);
    // Intl puts a no-break space before the euro sign.
    expect(formatEuro(2897)).toBe("28,97\u00a0€");
    expect(formatDate("2026-11-20")).toBe("20.11.2026");
  });

  it("reads a price in euro as cent", () => {
    expect(parsePrice("14,99")).toBe(1499);
    expect(parsePrice("14.99 €")).toBe(1499);
    expect(parsePrice("3")).toBe(300);
    expect(parsePrice("0")).toBe(0);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("-1")).toBeNull();
    expect(parsePrice("viel")).toBeNull();
    expect(parsePrice("1.299")).toBe(129900);
    // More than two decimals or a number in another notation is not a price.
    expect(parsePrice("14,999")).toBeNull();
    expect(parsePrice("1e3")).toBeNull();
  });

  it("writes a price for the price field", () => {
    expect(priceText(1499)).toBe("14,99");
    expect(priceText(300)).toBe("3,00");
  });
});

describe("parseAppId", () => {
  it("reads the ID from a store link or a number", () => {
    expect(parseAppId("https://store.steampowered.com/app/1145360/Hades/")).toEqual({
      kind: "id",
      id: 1145360,
    });
    expect(parseAppId(" 1145360 ")).toEqual({ kind: "id", id: 1145360 });
    expect(parseAppId("")).toEqual({ kind: "empty" });
  });

  it("rejects other texts", () => {
    expect(parseAppId("Hades")).toEqual({ kind: "invalid" });
    expect(parseAppId("0")).toEqual({ kind: "invalid" });
    expect(parseAppId("https://example.org/")).toEqual({ kind: "invalid" });
  });

  it("links the wide picture on the server of Steam", () => {
    expect(pictureUrl(1145360)).toBe(
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg",
    );
  });
});

describe("list changes", () => {
  it("adds, changes and removes a purchase", () => {
    const input = { date: "2026-01-01", name: "Fe", priceCents: 500, appId: null };
    const added = addPurchase({ purchases: [hades] }, input, "f");
    expect(added.purchases).toEqual([hades, { ...input, id: "f" }]);
    const changed = changePurchase(added, "f", { ...input, priceCents: 600 });
    expect(changed.purchases[1]).toEqual({ ...input, priceCents: 600, id: "f" });
    expect(changed.purchases[0]).toBe(hades);
    expect(removePurchase(changed, "h").purchases).toEqual([changed.purchases[1]]);
  });

  it("makes a new ID of 16 hex characters", () => {
    expect(newId()).toMatch(/^[0-9a-f]{16}$/);
  });
});
