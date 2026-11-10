import type { Cost, Income, Profile } from "./schema.ts";

/** A cost for tests. Monthly 10 € in "other", unless `fields` says else. */
export function testCost(fields: Partial<Cost> & { id: string }): Cost {
  return {
    name: fields.id,
    amountCents: 1000,
    interval: "monthly",
    dueMonth: 1,
    category: "other",
    icon: "receipt",
    ...fields,
  };
}

/** An income for tests. Monthly 100 €, unless `fields` says else. */
export function testIncome(fields: Partial<Income> & { id: string }): Income {
  return { name: fields.id, amountCents: 10000, interval: "monthly", dueMonth: 1, ...fields };
}

export function testProfile(fields: Partial<Profile> = {}): Profile {
  return { id: "p1", name: "Test", incomes: [], costs: [], ...fields };
}
