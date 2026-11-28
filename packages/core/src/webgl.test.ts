import { describe, expect, it, vi } from "vitest";
import { supportsWebGL2 } from "./webgl.ts";

describe("supportsWebGL2", () => {
  it("is false without WebGL 2", () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(supportsWebGL2()).toBe(false);
    expect(getContext).toHaveBeenCalledWith("webgl2");
  });

  it("is true with WebGL 2 and gives the test context back", () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => ({ loseContext }),
    } as unknown as WebGL2RenderingContext);
    expect(supportsWebGL2()).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("is true with WebGL 2 that cannot give the context back", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => null,
    } as unknown as WebGL2RenderingContext);
    expect(supportsWebGL2()).toBe(true);
  });
});
