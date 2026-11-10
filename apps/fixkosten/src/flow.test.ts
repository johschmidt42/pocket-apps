import { describe, expect, it } from "vitest";
import { buildFlow, shortLabel, type Flow } from "./flow.ts";
import { testCost, testIncome, testProfile } from "./test-data.ts";

const options = { withCosts: true, maxCostNodes: 20 };

/** The links as "source → target: value", for easy reading. */
function describeLinks(flow: Flow | null): string[] {
  if (!flow) return [];
  return flow.links.map(
    (link) =>
      `${flow.nodes[link.source]?.name ?? "?"} → ${flow.nodes[link.target]?.name ?? "?"}: ${String(link.value)}`,
  );
}

describe("buildFlow", () => {
  it("returns null without amounts", () => {
    expect(buildFlow(testProfile(), "month", options)).toBeNull();
    expect(
      buildFlow(testProfile({ costs: [testCost({ id: "a", amountCents: 0 })] }), "month", options),
    ).toBeNull();
  });

  it("flows from the incomes over the budget to the categories, the costs and the rest", () => {
    const profile = testProfile({
      incomes: [
        testIncome({ id: "Gehalt", amountCents: 300000 }),
        testIncome({ id: "Null", amountCents: 0 }),
      ],
      costs: [
        testCost({ id: "Miete", amountCents: 100000, category: "housing", icon: "house" }),
        testCost({ id: "Strom", amountCents: 120000, interval: "yearly", category: "energy" }),
      ],
    });

    const flow = buildFlow(profile, "month", options);

    expect(describeLinks(flow)).toEqual([
      "Gehalt → Budget: 300000",
      "Budget → Wohnen: 100000",
      "Wohnen → Miete: 100000",
      "Budget → Energie & Wasser: 10000",
      "Energie & Wasser → Strom: 10000",
      "Budget → Übrig: 190000",
    ]);
    expect(flow?.nodes.find((node) => node.name === "Miete")).toEqual({
      name: "Miete",
      color: "var(--chart-1)",
      icon: "house",
    });
  });

  it("adds a deficit when the costs are higher than the incomes", () => {
    const profile = testProfile({
      incomes: [testIncome({ id: "Gehalt", amountCents: 1000 })],
      costs: [testCost({ id: "Miete", amountCents: 3000 })],
    });

    expect(describeLinks(buildFlow(profile, "month", { ...options, withCosts: false }))).toEqual([
      "Gehalt → Budget: 1000",
      "Fehlbetrag → Budget: 2000",
      "Budget → Sonstiges: 3000",
    ]);
  });

  it("starts at the node Fixkosten without incomes and folds small costs", () => {
    const costs = ["a", "b", "c"].map((id, index) =>
      testCost({ id, amountCents: 3000 - index * 1000 }),
    );
    const profile = testProfile({ costs });

    expect(describeLinks(buildFlow(profile, "year", { withCosts: true, maxCostNodes: 2 }))).toEqual(
      ["Fixkosten → Sonstiges: 72000", "Sonstiges → a: 36000", "Sonstiges → 2 weitere: 36000"],
    );
  });

  it("shows only the incomes and the rest without costs", () => {
    const profile = testProfile({ incomes: [testIncome({ id: "Gehalt" })] });

    expect(describeLinks(buildFlow(profile, "month", options))).toEqual([
      "Gehalt → Budget: 10000",
      "Budget → Übrig: 10000",
    ]);
  });
});

describe("shortLabel", () => {
  it("cuts only long labels", () => {
    expect(shortLabel("Miete")).toBe("Miete");
    expect(shortLabel("Haftpflichtversicherung Familie", 10)).toBe("Haftpflic…");
  });
});
