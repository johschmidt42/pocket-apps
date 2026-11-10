import { describe, expect, it } from "vitest";
import { fieldOfView } from "./camera.ts";

describe("fieldOfView", () => {
  it("is 75 degrees in a wide or square picture", () => {
    expect(fieldOfView(2)).toBe(75);
    expect(fieldOfView(1)).toBe(75);
  });

  it("grows in a tall picture, so that the width shows the same", () => {
    const fov = fieldOfView(0.5);
    const halfWidth = Math.tan(((fov / 2) * Math.PI) / 180) * 0.5;
    expect(halfWidth).toBeCloseTo(Math.tan(((75 / 2) * Math.PI) / 180));
  });

  it("stops at 120 degrees", () => {
    expect(fieldOfView(0.1)).toBe(120);
  });
});
