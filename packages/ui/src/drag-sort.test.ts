import { describe, expect, it } from "vitest";
import { dragHandleId, dropPosition, moveById, moveTo } from "./drag-sort.ts";

describe("dropPosition", () => {
  it("is before in the upper half of the row and after in the lower half", () => {
    const row = { top: 100, height: 40 };

    expect(dropPosition(110, row)).toBe("before");
    expect(dropPosition(120, row)).toBe("after");
    expect(dropPosition(139, row)).toBe("after");
  });

  it("gives each handle a DOM ID", () => {
    expect(dragHandleId("a1")).toBe("drag-a1");
  });
});

describe("moveById", () => {
  it("moves an item and keeps the list at the edges", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(moveById(list, "b", -1).map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moveById(list, "b", 1).map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(moveById(list, "a", -1)).toEqual(list);
    expect(moveById(list, "c", 1)).toEqual(list);
    expect(moveById(list, "x", 1)).toEqual(list);
  });
});

describe("moveTo", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  it("puts the dragged item before or after the target", () => {
    expect(ids(moveTo(list, "c", "a", "before"))).toEqual(["c", "a", "b"]);
    expect(ids(moveTo(list, "a", "b", "after"))).toEqual(["b", "a", "c"]);
    expect(ids(moveTo(list, "a", "c", "after"))).toEqual(["b", "c", "a"]);
  });

  it("keeps the list for a missing or the same ID", () => {
    expect(moveTo(list, "x", "a", "before")).toEqual(list);
    expect(moveTo(list, "a", "x", "before")).toEqual(list);
    expect(moveTo(list, "a", "a", "after")).toEqual(list);
  });
});
