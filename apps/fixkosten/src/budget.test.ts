import { describe, expect, it } from "vitest";
import { extraPayments, paymentsPerMonth, summarize, totalsByCategory } from "./budget.ts";
import { testCost, testIncome, testProfile } from "./test-data.ts";

const costs = [
  testCost({ id: "rent", amountCents: 100000, category: "housing" }),
  testCost({ id: "power", amountCents: 9000, category: "energy" }),
  testCost({
    id: "water",
    amountCents: 12000,
    interval: "quarterly",
    dueMonth: 2,
    category: "energy",
  }),
  testCost({
    id: "insurance",
    amountCents: 12000,
    interval: "yearly",
    dueMonth: 3,
    category: "insurance",
  }),
  testCost({ id: "free", amountCents: 0, category: "health" }),
];

describe("summarize", () => {
  it("adds the costs and the incomes and finds the rest and the reserve", () => {
    const profile = testProfile({
      costs,
      incomes: [testIncome({ id: "salary", amountCents: 200000 })],
    });

    expect(summarize(profile, "month")).toEqual({
      costs: 100000 + 9000 + 4000 + 1000,
      incomes: 200000,
      remaining: 200000 - 114000,
      reserve: 5000,
    });
    expect(summarize(profile, "year").costs).toBe(114000 * 12);
  });

  it("has no rest without an income or with an income of 0 €", () => {
    expect(summarize(testProfile({ costs }), "month").remaining).toBeNull();
    const zero = testProfile({ costs, incomes: [testIncome({ id: "zero", amountCents: 0 })] });
    expect(summarize(zero, "month").remaining).toBeNull();
  });
});

describe("totalsByCategory", () => {
  it("sorts the categories and their costs by amount and leaves out empty ones", () => {
    const totals = totalsByCategory(costs, "month");

    expect(totals.map((total) => [total.category, total.amount])).toEqual([
      ["housing", 100000],
      ["energy", 13000],
      ["insurance", 1000],
    ]);
    expect(totals[1]?.costs.map((cost) => cost.id)).toEqual(["power", "water"]);
  });
});

describe("paymentsPerMonth", () => {
  it("puts each payment into its month and category", () => {
    const months = paymentsPerMonth(costs);

    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: 1, housing: 100000, energy: 9000 });
    expect(months[1]).toEqual({ month: 2, housing: 100000, energy: 21000 });
    expect(months[2]).toEqual({ month: 3, housing: 100000, energy: 9000, insurance: 12000 });
  });
});

describe("extraPayments", () => {
  it("lists the months with payments that are not monthly", () => {
    expect(
      extraPayments(costs).map((entry) => [
        entry.month,
        entry.total,
        entry.costs.map((cost) => cost.id),
      ]),
    ).toEqual([
      [2, 12000, ["water"]],
      [3, 12000, ["insurance"]],
      [5, 12000, ["water"]],
      [8, 12000, ["water"]],
      [11, 12000, ["water"]],
    ]);
  });
});
