import { describe, expect, it } from "vitest";
import { dragHandleId, dropPosition } from "./use-drag-sort.ts";

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
