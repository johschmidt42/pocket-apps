import { describe, expect, it } from "vitest";
import { paginate, type PageUnit } from "./pages.ts";

const unit = (top: number, bottom: number, keepWithNext = false): PageUnit => ({
  top,
  bottom,
  keepWithNext,
});

describe("paginate", () => {
  it("keeps a short CV on one page", () => {
    expect(paginate([unit(12, 40), unit(45, 100)], 12, 273)).toEqual([{ start: 12, height: 88 }]);
  });

  it("moves a block that does not fit to the next page as a whole", () => {
    const pages = paginate([unit(12, 200), unit(205, 290), unit(295, 320)], 12, 273);

    expect(pages).toEqual([
      { start: 12, height: 193 },
      { start: 205, height: 115 },
    ]);
  });

  it("moves a title together with the block after it", () => {
    const pages = paginate([unit(12, 250), unit(255, 262, true), unit(265, 300)], 12, 273);

    expect(pages.map((page) => page.start)).toEqual([12, 255]);
  });

  it("splits a block that is higher than a page", () => {
    const pages = paginate([unit(12, 20, true), unit(25, 400)], 12, 273);

    expect(pages).toEqual([
      { start: 12, height: 13 },
      { start: 25, height: 273 },
      { start: 298, height: 102 },
    ]);
  });

  it("gives an empty CV one page", () => {
    expect(paginate([], 12, 273)).toEqual([{ start: 12, height: 0 }]);
  });
});
