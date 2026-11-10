import { describe, expect, it } from "vitest";
import { read } from "./buffers.ts";

describe("read", () => {
  it("reads a value in the array", () => {
    expect(read(new Float32Array([1, 2.5]), 1)).toBe(2.5);
  });

  it("gives 0 outside the array", () => {
    expect(read(new Float32Array([1]), 3)).toBe(0);
  });
});
