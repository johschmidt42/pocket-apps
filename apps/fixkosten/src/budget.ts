import { CATEGORIES, type Category, type Cost, type Profile } from "./schema.ts";
import { amountPer, paysInMonth, type Period } from "./money.ts";

export type Summary = {
  costs: number;
  incomes: number;
  /** Income minus costs. Negative if the costs are higher. `null` without income (or with 0 €). */
  remaining: number | null;
  /** The part of the costs that are not monthly, per month: the amount to put aside each month. */
  reserve: number;
};

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** The totals of a profile, in cents per month or per year. */
export function summarize(profile: Profile, period: Period): Summary {
  const costs = sum(profile.costs.map((cost) => amountPer(cost, period)));
  const incomes = sum(profile.incomes.map((income) => amountPer(income, period)));
  const reserve = sum(
    profile.costs
      .filter((cost) => cost.interval !== "monthly")
      .map((cost) => amountPer(cost, "month")),
  );
  return {
    costs,
    incomes,
    remaining: incomes > 0 ? incomes - costs : null,
    reserve,
  };
}

export type CategoryTotal = { category: Category; amount: number; costs: Cost[] };

/**
 * The costs of each category, largest first. Leaves out empty categories.
 * Each category lists its costs, largest first.
 */
export function totalsByCategory(costs: readonly Cost[], period: Period): CategoryTotal[] {
  return CATEGORIES.map((category) => {
    const inCategory = costs
      .filter((cost) => cost.category === category && cost.amountCents > 0)
      .sort((a, b) => amountPer(b, period) - amountPer(a, period));
    return {
      category,
      amount: sum(inCategory.map((cost) => amountPer(cost, period))),
      costs: inCategory,
    };
  })
    .filter((total) => total.costs.length > 0)
    .sort((a, b) => b.amount - a.amount);
}

export type MonthPayments = { month: number } & Partial<Record<Category, number>>;

/** The real payments in each month of a year, per category, in cents. */
export function paymentsPerMonth(costs: readonly Cost[]): MonthPayments[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const row: MonthPayments = { month };
    for (const cost of costs) {
      if (cost.amountCents > 0 && paysInMonth(cost, month)) {
        row[cost.category] = (row[cost.category] ?? 0) + cost.amountCents;
      }
    }
    return row;
  });
}

export type ExtraPayments = { month: number; total: number; costs: Cost[] };

/** The months with payments that are not monthly, and these costs. In month order. */
export function extraPayments(costs: readonly Cost[]): ExtraPayments[] {
  const extras = costs.filter((cost) => cost.interval !== "monthly" && cost.amountCents > 0);
  return Array.from({ length: 12 }, (_, index) => index + 1)
    .map((month) => {
      const due = extras.filter((cost) => paysInMonth(cost, month));
      return { month, total: sum(due.map((cost) => cost.amountCents)), costs: due };
    })
    .filter((entry) => entry.costs.length > 0);
}
