import { describe, expect, it } from "vitest";
import { costRows, incomeRows } from "./rows.ts";
import { testCost, testIncome } from "./test-data.ts";

const plain = (text: string | null) => text?.replace(/\s/g, " ") ?? null;

describe("costRows", () => {
  it("sorts by category, then by amount, and describes the interval", () => {
    const rows = costRows([
      testCost({
        id: "b",
        amountCents: 1000,
        category: "energy",
        interval: "quarterly",
        dueMonth: 2,
      }),
      testCost({
        id: "c",
        amountCents: 1200,
        category: "insurance",
        interval: "yearly",
        dueMonth: 3,
      }),
      testCost({
        id: "a",
        amountCents: 5000,
        category: "energy",
        interval: "half-yearly",
        dueMonth: 4,
      }),
      testCost({ id: "h", amountCents: 9000, category: "housing" }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["h", "a", "b", "c"]);
    expect(rows.map((row) => row.detail)).toEqual([
      "Wohnen · monatlich",
      "Energie & Wasser · halbjährlich ab April",
      "Energie & Wasser · vierteljährlich ab Februar",
      "Versicherungen · jährlich im März",
    ]);
    expect(plain(rows[3]?.equivalent ?? null)).toBe("1,00 € pro Monat");
    expect(rows[0]?.equivalent).toBeNull();
  });
});

describe("incomeRows", () => {
  it("keeps the order and shows the amount", () => {
    const rows = incomeRows([testIncome({ id: "x", amountCents: 250000 })]);

    expect(plain(rows[0]?.amount ?? null)).toBe("2.500,00 €");
    expect(rows[0]?.detail).toBe("monatlich");
  });
});
