import { sum, totalsByCategory } from "./budget.ts";
import { CATEGORY_INFO } from "./categories.ts";
import { amountPer, type Period } from "./money.ts";
import type { Category, IconName, Profile } from "./schema.ts";

export type FlowNode = {
  name: string;
  /** A CSS color for the SVG. */
  color: string;
  icon: IconName | null;
};

/** `source` and `target` are indexes in `nodes`. `value` is in cents. */
export type FlowLink = { source: number; target: number; value: number };

export type Flow = { nodes: FlowNode[]; links: FlowLink[] };

export type FlowOptions = {
  /** Show each cost after its category. Else the flow ends at the categories. */
  withCosts: boolean;
  /**
   * The most cost nodes in the whole chart. Each category shows at least 2.
   * More costs in a category become one node "n weitere". Too many nodes make the chart unreadable.
   */
  maxCostNodes: number;
};

const NEUTRAL = "var(--chart-other)";

/**
 * The flow of money for the Sankey chart: incomes → budget → categories → costs.
 * The budget also flows to "Übrig" if the incomes are higher than the costs.
 * A node "Fehlbetrag" flows into the budget if the costs are higher.
 * Without incomes, the flow starts at the budget node "Fixkosten".
 * Returns `null` if there is nothing to show.
 */
export function buildFlow(profile: Profile, period: Period, options: FlowOptions): Flow | null {
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];
  const addNode = (node: FlowNode) => nodes.push(node) - 1;

  const categories = totalsByCategory(profile.costs, period);
  const costTotal = sum(categories.map((category) => category.amount));
  const incomes = profile.incomes
    .map((income) => ({ name: income.name, amount: amountPer(income, period) }))
    .filter((income) => income.amount > 0);
  const incomeTotal = sum(incomes.map((income) => income.amount));
  if (costTotal === 0 && incomeTotal === 0) return null;
  const perCategory = Math.max(
    2,
    Math.floor(options.maxCostNodes / Math.max(1, categories.length)),
  );

  const budget = addNode({
    name: incomes.length > 0 ? "Budget" : "Fixkosten",
    color: NEUTRAL,
    icon: null,
  });
  for (const income of incomes) {
    const node = addNode({ name: income.name, color: NEUTRAL, icon: "wallet" });
    links.push({ source: node, target: budget, value: income.amount });
  }
  if (incomes.length > 0 && costTotal > incomeTotal) {
    const node = addNode({ name: "Fehlbetrag", color: "var(--destructive)", icon: null });
    links.push({ source: node, target: budget, value: costTotal - incomeTotal });
  }

  for (const total of categories) {
    const info = CATEGORY_INFO[total.category];
    const categoryNode = addNode({ name: info.label, color: info.color, icon: info.icon });
    links.push({ source: budget, target: categoryNode, value: total.amount });
    if (options.withCosts) addCosts(total.category, total.costs, categoryNode);
  }

  if (incomeTotal > costTotal) {
    const node = addNode({ name: "Übrig", color: NEUTRAL, icon: "piggy-bank" });
    links.push({ source: budget, target: node, value: incomeTotal - costTotal });
  }
  return { nodes, links };

  function addCosts(category: Category, costs: Profile["costs"], categoryNode: number) {
    const color = CATEGORY_INFO[category].color;
    const shown = costs.length > perCategory ? perCategory - 1 : costs.length;
    for (const cost of costs.slice(0, shown)) {
      const node = addNode({ name: cost.name, color, icon: cost.icon });
      links.push({ source: categoryNode, target: node, value: amountPer(cost, period) });
    }
    const rest = costs.slice(shown);
    if (rest.length === 0) return;
    const node = addNode({ name: `${String(rest.length)} weitere`, color, icon: null });
    links.push({
      source: categoryNode,
      target: node,
      value: sum(rest.map((cost) => amountPer(cost, period))),
    });
  }
}

/** Cuts a long label: "Haftpflichtversicherung Familie" → "Haftpflichtversicherung F…". */
export function shortLabel(name: string, maxLength = 24): string {
  return name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;
}
