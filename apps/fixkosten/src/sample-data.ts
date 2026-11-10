import type { Cost, Income } from "./schema.ts";

type Example<T> = Omit<T, "id">;

/** Example entries, so that a new user can see the charts at once. */
export const SAMPLE_INCOMES: readonly Example<Income>[] = [
  { name: "Gehalt", amountCents: 320000, interval: "monthly", dueMonth: 1 },
  { name: "Weihnachtsgeld", amountCents: 150000, interval: "yearly", dueMonth: 11 },
];

export const SAMPLE_COSTS: readonly Example<Cost>[] = [
  {
    name: "Miete",
    amountCents: 115000,
    interval: "monthly",
    dueMonth: 1,
    category: "housing",
    icon: "house",
  },
  {
    name: "Strom",
    amountCents: 8500,
    interval: "monthly",
    dueMonth: 1,
    category: "energy",
    icon: "zap",
  },
  {
    name: "Internet",
    amountCents: 3999,
    interval: "monthly",
    dueMonth: 1,
    category: "communication",
    icon: "wifi",
  },
  {
    name: "Handy",
    amountCents: 1500,
    interval: "monthly",
    dueMonth: 1,
    category: "communication",
    icon: "smartphone",
  },
  {
    name: "Netflix",
    amountCents: 1399,
    interval: "monthly",
    dueMonth: 1,
    category: "communication",
    icon: "tv",
  },
  {
    name: "Rundfunkbeitrag",
    amountCents: 5508,
    interval: "quarterly",
    dueMonth: 1,
    category: "communication",
    icon: "radio",
  },
  {
    name: "Deutschlandticket",
    amountCents: 5800,
    interval: "monthly",
    dueMonth: 1,
    category: "mobility",
    icon: "train",
  },
  {
    name: "Haftpflichtversicherung",
    amountCents: 6500,
    interval: "yearly",
    dueMonth: 3,
    category: "insurance",
    icon: "shield",
  },
  {
    name: "Hausratversicherung",
    amountCents: 9800,
    interval: "yearly",
    dueMonth: 6,
    category: "insurance",
    icon: "shield",
  },
  {
    name: "Fitnessstudio",
    amountCents: 3490,
    interval: "monthly",
    dueMonth: 1,
    category: "health",
    icon: "dumbbell",
  },
  {
    name: "ETF-Sparplan",
    amountCents: 25000,
    interval: "monthly",
    dueMonth: 1,
    category: "savings",
    icon: "trending-up",
  },
  {
    name: "Gemeinschaftskonto",
    amountCents: 40000,
    interval: "monthly",
    dueMonth: 1,
    category: "household",
    icon: "users",
  },
];
