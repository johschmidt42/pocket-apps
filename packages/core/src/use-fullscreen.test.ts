import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFullscreen } from "./use-fullscreen.ts";

/**
 * jsdom has no Fullscreen API. This copy acts like Chrome: it sets the full-screen element
 * and sends "fullscreenchange". `refuse` makes the browser say no to each request.
 */
function fakeFullscreen({ refuse = false } = {}) {
  let element: Element | null = null;
  function change(next: Element | null) {
    element = next;
    document.dispatchEvent(new Event("fullscreenchange"));
  }
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => element });
  const request = vi.fn(() => {
    if (refuse) return Promise.reject(new Error("The browser refused."));
    change(document.documentElement);
    return Promise.resolve();
  });
  const exit = vi.fn(() => {
    if (refuse) return Promise.reject(new Error("The page is not in full screen."));
    change(null);
    return Promise.resolve();
  });
  document.documentElement.requestFullscreen = request;
  document.exitFullscreen = exit;
  return { request, exit, change };
}

describe("useFullscreen", () => {
  it("says that the full screen is not possible in a browser with no Fullscreen API", () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: false });
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.possible).toBe(false);
    expect(result.current.active).toBe(false);
  });

  it("puts the whole page into full screen and back", async () => {
    const { request, exit } = fakeFullscreen();
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.possible).toBe(true);

    act(() => {
      result.current.enter();
    });
    await waitFor(() => {
      expect(result.current.active).toBe(true);
    });
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.contexts[0]).toBe(document.documentElement);

    act(() => {
      result.current.exit();
    });
    await waitFor(() => {
      expect(result.current.active).toBe(false);
    });
    expect(exit).toHaveBeenCalledOnce();
  });

  it("follows the Esc key, which ends the full screen without the app", async () => {
    const { change } = fakeFullscreen();
    const { result } = renderHook(() => useFullscreen());
    act(() => {
      result.current.enter();
    });
    await waitFor(() => {
      expect(result.current.active).toBe(true);
    });
    act(() => {
      change(null);
    });
    expect(result.current.active).toBe(false);
  });

  it("changes nothing when the browser refuses", async () => {
    const { request, exit } = fakeFullscreen({ refuse: true });
    const { result } = renderHook(() => useFullscreen());
    act(() => {
      result.current.enter();
      result.current.exit();
    });
    await waitFor(() => {
      expect(request).toHaveBeenCalledOnce();
    });
    expect(exit).toHaveBeenCalledOnce();
    expect(result.current.active).toBe(false);
  });

  it("stops to listen when the app closes", () => {
    const { change } = fakeFullscreen();
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useFullscreen());
    unmount();
    expect(remove).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
    // A change after the end does not reach the hook.
    expect(() => {
      change(document.documentElement);
    }).not.toThrow();
  });
});
