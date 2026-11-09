import { describe, expect, it } from "vitest";
import { addIdea, moveIdea, newId, removeIdea } from "./ideas.ts";
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
    expect(addIdea(list, "  Wetter ", "  Regenradar ", "d").ideas.at(-1)).toEqual({
      id: "d",
      title: "Wetter",
      description: "Regenradar",
    });
  });

  it("allows an empty description", () => {
    expect(addIdea(list, "Wetter", "   ", "d").ideas.at(-1)?.description).toBe("");
  });

  it("ignores an empty title", () => {
    expect(addIdea(list, "   ", "Text", "d")).toBe(list);
  });
});

describe("removeIdea", () => {
  it("removes the given idea", () => {
    expect(order(removeIdea(list, "b"))).toEqual(["a", "c"]);
  });
});

describe("moveIdea", () => {
  it("moves an idea up", () => {
    expect(order(moveIdea(list, "c", "up"))).toEqual(["a", "c", "b"]);
  });

  it("moves an idea down", () => {
    expect(order(moveIdea(list, "a", "down"))).toEqual(["b", "a", "c"]);
  });

  it("does nothing at the start or the end of the list", () => {
    expect(moveIdea(list, "a", "up")).toBe(list);
    expect(moveIdea(list, "c", "down")).toBe(list);
  });

  it("does nothing for an unknown ID", () => {
    expect(moveIdea(list, "x", "up")).toBe(list);
  });
});
