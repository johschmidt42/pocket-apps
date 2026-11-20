import { describe, expect, it } from "vitest";
import {
  dragHandleId,
  dropPosition,
  moveById,
  moveTo,
  scrollSpeed,
  stepToward,
} from "./drag-sort.ts";

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

describe("stepToward", () => {
  const before = { top: 0, height: 40 };
  const after = { top: 100, height: 40 };

  it("moves up when the top passes the middle of the row before", () => {
    expect(stepToward({ top: 19, height: 40 }, before, after)).toBe(-1);
    expect(stepToward({ top: 20, height: 40 }, before, after)).toBeNull();
  });

  it("moves down when the bottom passes the middle of the row after", () => {
    expect(stepToward({ top: 81, height: 40 }, before, after)).toBe(1);
    expect(stepToward({ top: 80, height: 40 }, before, after)).toBeNull();
    // A tall row: its bottom counts, not the place of the finger.
    expect(stepToward({ top: 30, height: 100 }, before, after)).toBe(1);
  });

  it("stays at the edges of the list", () => {
    expect(stepToward({ top: -50, height: 40 }, null, after)).toBeNull();
    expect(stepToward({ top: 500, height: 40 }, before, null)).toBeNull();
  });
});

describe("scrollSpeed", () => {
  it("scrolls up near the top and down near the bottom, faster near the edge", () => {
    expect(scrollSpeed(400, 0, 800)).toBe(0);
    expect(scrollSpeed(60, 0, 800)).toBe(-1);
    expect(scrollSpeed(0, 0, 800)).toBe(-16);
    expect(scrollSpeed(760, 0, 800)).toBe(6);
    expect(scrollSpeed(900, 0, 800)).toBe(16);
  });
});
