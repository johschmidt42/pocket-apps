import { describe, expect, it } from "vitest";
import { summaryTiles } from "./summary-tiles-data.ts";

const plain = (text: string) => text.replace(/\s/g, " ");
const labels = (tiles: ReturnType<typeof summaryTiles>) => tiles.map((tile) => tile.label);

describe("summaryTiles", () => {
  it("shows only the costs without income and reserve", () => {
    const tiles = summaryTiles({ costs: 1000, incomes: 0, remaining: null, reserve: 0 }, "year");

    expect(labels(tiles)).toEqual(["Fixkosten pro Jahr"]);
  });

  it("shows income, rest, share and reserve", () => {
    const tiles = summaryTiles(
      { costs: 2500, incomes: 10000, remaining: 7500, reserve: 100 },
      "month",
    );

    expect(labels(tiles)).toEqual([
      "Fixkosten pro Monat",
      "Einkommen pro Monat",
      "Übrig pro Monat",
      "Rücklage pro Monat",
    ]);
    expect(tiles[1]?.note).toBe("Fixkosten: 25 % davon");
    expect(plain(tiles[2]?.value ?? "")).toBe("75,00 €");
  });

  it("shows a deficit as a positive amount", () => {
    const tiles = summaryTiles(
      { costs: 3000, incomes: 1000, remaining: -2000, reserve: 0 },
      "month",
    );

    expect(tiles[2]?.label).toBe("Fehlbetrag pro Monat");
    expect(plain(tiles[2]?.value ?? "")).toBe("20,00 €");
  });
});
