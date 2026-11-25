import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./use-wake-lock.ts";

/** A stand-in for the Screen Wake Lock API. jsdom has none. */
function stubWakeLock(refuse = false) {
  const release = vi.fn(() => Promise.resolve());
  const request = vi.fn(() =>
    refuse ? Promise.reject(new Error("low battery")) : Promise.resolve({ release }),
  );
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
  return { request, release };
}

function removeWakeLock() {
  Reflect.deleteProperty(navigator, "wakeLock");
}

describe("useWakeLock", () => {
  it("keeps the screen on while active and releases the lock after", async () => {
    const { request, release } = stubWakeLock();
    const { rerender } = renderHook(
      ({ active }) => {
        useWakeLock(active);
      },
      { initialProps: { active: true } },
    );

    expect(request).toHaveBeenCalledWith("screen");
    // Wait until the browser gave the lock.
    await Promise.resolve();
    rerender({ active: false });

    expect(release).toHaveBeenCalledOnce();
    removeWakeLock();
  });

  it("asks again when the tab is visible again", () => {
    const { request } = stubWakeLock();
    renderHook(() => {
      useWakeLock(true);
    });

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(request).toHaveBeenCalledOnce();

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(request).toHaveBeenCalledTimes(2);
    removeWakeLock();
  });

  it("releases a lock that comes after the end", async () => {
    const { release } = stubWakeLock();
    const { unmount } = renderHook(() => {
      useWakeLock(true);
    });

    unmount();

    await waitFor(() => {
      expect(release).toHaveBeenCalledOnce();
    });
    removeWakeLock();
  });

  it("works when the browser refuses the lock", async () => {
    const { request } = stubWakeLock(true);
    const { unmount } = renderHook(() => {
      useWakeLock(true);
    });

    await waitFor(() => {
      expect(request).toHaveBeenCalled();
    });
    unmount();
    removeWakeLock();
  });

  it("does nothing when inactive or without the API", () => {
    const { request } = stubWakeLock();
    renderHook(() => {
      useWakeLock(false);
    });
    expect(request).not.toHaveBeenCalled();

    removeWakeLock();
    expect(() =>
      renderHook(() => {
        useWakeLock(true);
      }),
    ).not.toThrow();
  });
});
