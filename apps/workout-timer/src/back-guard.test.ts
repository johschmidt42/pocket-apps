import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { armBackGuard, disarmBackGuard, useBackGuard } from "./back-guard.ts";

const GUARD = { workoutTimerGuard: true };

describe("useBackGuard", () => {
  it("removes an extra entry from before a reload", async () => {
    window.history.replaceState({ before: true }, "");
    window.history.pushState(GUARD, "");

    renderHook(() => {
      useBackGuard(false, vi.fn());
    });

    await waitFor(() => {
      expect(window.history.state).toEqual({ before: true });
    });
  });

  it("goes back from an old extra entry that the forward button shows", async () => {
    window.history.replaceState({ before: true }, "");
    window.history.pushState(GUARD, "");
    window.history.back();
    await waitFor(() => {
      expect(window.history.state).toEqual({ before: true });
    });
    const onBack = vi.fn();
    renderHook(() => {
      useBackGuard(false, onBack);
    });

    act(() => {
      window.history.forward();
    });

    await waitFor(() => {
      expect(window.history.state).toEqual({ before: true });
    });
    expect(onBack).not.toHaveBeenCalled();
  });

  it("adds the entry again when a timer starts while the app goes back", async () => {
    window.history.replaceState({ before: true }, "");
    const onBack = vi.fn();
    renderHook(() => {
      useBackGuard(true, onBack);
    });
    act(() => {
      armBackGuard();
    });

    // The end of the timer, then at once a new timer, before the browser went back.
    disarmBackGuard();
    armBackGuard();
    // A second end before the browser went back does not go back one more step.
    disarmBackGuard();

    await waitFor(() => {
      expect(window.history.state).toEqual(GUARD);
    });
    expect(onBack).not.toHaveBeenCalled();
  });
});
