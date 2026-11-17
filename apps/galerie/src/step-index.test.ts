import { describe, expect, it } from "vitest";
import { stepIndex } from "./step-index.ts";

describe("stepIndex", () => {
  it("selects the previous and the next image, but stays in the list", () => {
    expect(stepIndex("ArrowDown", 0, 3)).toBe(1);
    expect(stepIndex("ArrowRight", 2, 3)).toBe(2);
    expect(stepIndex("ArrowUp", 2, 3)).toBe(1);
    expect(stepIndex("ArrowLeft", 0, 3)).toBe(0);
  });

  it("selects the first and the last image", () => {
    expect(stepIndex("Home", 2, 3)).toBe(0);
    expect(stepIndex("End", 0, 3)).toBe(2);
  });

  it("does nothing for other keys and for no images", () => {
    expect(stepIndex("Enter", 0, 3)).toBeNull();
    expect(stepIndex("ArrowDown", 0, 0)).toBeNull();
  });
});
