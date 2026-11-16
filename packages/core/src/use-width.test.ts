import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWidth } from "./use-width.ts";

describe("useWidth", () => {
  it("measures the element at once and after each resize", () => {
    let report: () => void = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          report = callback;
        }
        observe() {
          // The test calls `report` itself.
        }
        disconnect = disconnect;
      },
    );
    const element = document.createElement("div");
    const rect = vi.spyOn(element, "getBoundingClientRect");
    rect.mockReturnValue(DOMRect.fromRect({ width: 320, height: 10 }));

    const { result, unmount } = renderHook(() => useWidth({ current: element }));
    expect(result.current).toBe(320);

    rect.mockReturnValue(DOMRect.fromRect({ width: 500, height: 10 }));
    act(() => {
      report();
    });
    expect(result.current).toBe(500);

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("is 0 without an element", () => {
    const { result } = renderHook(() => useWidth({ current: null }));

    expect(result.current).toBe(0);
  });
});
