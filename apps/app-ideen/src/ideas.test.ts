import { describe, expect, it } from "vitest";
import { addIdea, newId, removeIdea } from "./ideas.ts";
import type { IdeaList } from "./schema.ts";

const list: IdeaList = {
  ideas: [
    { id: "a", title: "Pflanzen", description: "Gießplan" },
    { id: "b", title: "Rezepte", description: "" },
    { id: "c", title: "Fahrtenbuch", description: "Kilometer" },
  ],
};

const order = (result: IdeaList) => result.ideas.map((idea) => idea.id);

describe("newId", () => {
  it("returns a 16-digit hex ID", () => {
    expect(newId()).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns a different ID each time", () => {
    expect(newId()).not.toBe(newId());
  });
});

describe("addIdea", () => {
  it("adds a trimmed idea at the end", () => {
    expect(
      addIdea(list, { id: "d", title: "  Wetter ", description: "  Regenradar " }).ideas.at(-1),
    ).toEqual({
      id: "d",
      title: "Wetter",
      description: "Regenradar",
    });
  });

  it("allows an empty description", () => {
    expect(
      addIdea(list, { id: "d", title: "Wetter", description: "   " }).ideas.at(-1)?.description,
    ).toBe("");
  });

  it("ignores an empty title", () => {
    expect(addIdea(list, { id: "d", title: "   ", description: "Text" })).toBe(list);
  });
});

describe("removeIdea", () => {
  it("removes the given idea", () => {
    expect(order(removeIdea(list, "b"))).toEqual(["a", "c"]);
  });
});
