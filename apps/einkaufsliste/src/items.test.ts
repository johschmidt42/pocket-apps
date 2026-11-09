import { describe, expect, it } from "vitest";
import { addItem, clearDone, newId, removeItem, toggleItem } from "./items.ts";
import type { ShoppingList } from "./schema.ts";

const list: ShoppingList = {
  items: [
    { id: "a", name: "Milch", done: false },
    { id: "b", name: "Brot", done: true },
  ],
};

describe("newId", () => {
  it("returns a 16-digit hex ID", () => {
    expect(newId()).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns a different ID each time", () => {
    expect(newId()).not.toBe(newId());
  });
});

describe("addItem", () => {
  it("adds a trimmed, open item at the end", () => {
    expect(addItem(list, "  Eier ", "c").items.at(-1)).toEqual({
      id: "c",
      name: "Eier",
      done: false,
    });
  });

  it("ignores an empty name", () => {
    expect(addItem(list, "   ", "c")).toBe(list);
  });
});

describe("toggleItem", () => {
  it("toggles only the given item", () => {
    expect(toggleItem(list, "a").items).toEqual([
      { id: "a", name: "Milch", done: true },
      { id: "b", name: "Brot", done: true },
    ]);
  });
});

describe("removeItem", () => {
  it("removes the given item", () => {
    expect(removeItem(list, "a").items).toEqual([{ id: "b", name: "Brot", done: true }]);
  });
});

describe("clearDone", () => {
  it("removes all done items", () => {
    expect(clearDone(list).items).toEqual([{ id: "a", name: "Milch", done: false }]);
  });
});
