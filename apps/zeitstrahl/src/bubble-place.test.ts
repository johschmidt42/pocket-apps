import { describe, expect, it } from "vitest";
import { bubblePlace } from "./bubble-place.ts";

describe("bubblePlace", () => {
  it("puts the bubble at the outer side with the widest width that fits", () => {
    expect(bubblePlace({ left: 400, right: 700 }, 1400, "left")).toEqual({
      side: "left",
      width: 320,
    });
    expect(bubblePlace({ left: 700, right: 1100 }, 1400, "right")).toEqual({
      side: "right",
      width: 240,
    });
    // 298 px of space: 320 px do not fit, 240 px do.
    expect(bubblePlace({ left: 298, right: 600 }, 1300, "left")).toEqual({
      side: "left",
      width: 240,
    });
    expect(bubblePlace({ left: 222, right: 500 }, 1000, "left")).toEqual({
      side: "left",
      width: 200,
    });
  });

  it("puts the bubble above the card when the outer side is too narrow", () => {
    expect(bubblePlace({ left: 221, right: 500 }, 1000, "left")).toEqual({
      side: "top",
      width: 320,
    });
    expect(bubblePlace({ left: 500, right: 800 }, 900, "right")).toEqual({
      side: "top",
      width: 320,
    });
  });
});
