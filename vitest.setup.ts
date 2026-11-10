import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// jsdom has no ResizeObserver. Radix needs it when a tooltip opens. jsdom has no layout,
// so the observer has nothing to report.
class NoLayoutResizeObserver {
  observe(): void {
    // No layout in jsdom.
  }
  unobserve(): void {
    // No layout in jsdom.
  }
  disconnect(): void {
    // No layout in jsdom.
  }
}
if (!("ResizeObserver" in globalThis)) globalThis.ResizeObserver = NoLayoutResizeObserver;
