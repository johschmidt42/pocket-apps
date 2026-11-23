import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import { card, fran, openApp } from "./test-app.tsx";

// These tests render the whole app with the list of all 360 workouts. See "Longer time limit for
// the tests of the whole trainingsbuch app" in docs/decisions.md.
vi.setConfig({ testTimeout: 15_000 });

describe("Trainingsbuch: history and navigation", () => {
  it("shows the history and a result of an unknown workout", async () => {
    const { user } = await openApp({
      workouts: [],
      results: [
        fran("a", 300, { notes: "gut" }),
        { ...fran("b", 99, { date: "2026-11-02" }), workoutId: "gone" },
      ],
    });

    await user.click(screen.getByRole("tab", { name: "Verlauf" }));
    const rows = screen.getAllByRole("button", { name: /Fran|Unbekanntes Workout/ });
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Unbekanntes Workout/) as string,
      expect.stringMatching(/^Fran.*gut/) as string,
    ]);
    expect(rows[0]).toBeDisabled();
  });

  it("opens a workout at its top and goes back to the same place in the list", async () => {
    const { user } = await openApp();
    document.documentElement.scrollTop = 900;

    await user.click(card("Barbara"));
    expect(document.documentElement.scrollTop).toBe(0);

    await user.click(screen.getByRole("button", { name: "Alle Workouts" }));
    await waitFor(() => {
      expect(document.documentElement.scrollTop).toBe(900);
    });
  });

  it("goes back to the list in the same tab with the back button of the browser", async () => {
    const { user } = await openApp({ workouts: [], results: [fran("r1", 300)] });
    await user.click(screen.getByRole("tab", { name: "Verlauf" }));
    await user.click(screen.getByRole("button", { name: /^Fran/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Fran" })).toBeVisible();
    expect(window.location.hash).toBe("#fran");

    act(() => {
      window.history.back();
    });
    expect(await screen.findByRole("tab", { name: "Verlauf" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(window.location.hash).toBe("");
  });

  it("shows the open workout again after a reload", async () => {
    window.history.replaceState(null, "", "/#fran");
    const user = userEvent.setup();
    render(<App folderHost={createMemoryFolderHost({ saved: createMemoryFolder() })} />);
    expect(await screen.findByRole("heading", { level: 2, name: "Fran" })).toBeVisible();

    // No entry of the app is before the workout. The button shows the list all the same.
    await user.click(screen.getByRole("button", { name: "Alle Workouts" }));
    expect(screen.getByRole("tab", { name: "Workouts" })).toBeVisible();
    expect(window.location.hash).toBe("");
  });

  it("shows the list for an unknown workout in the URL", async () => {
    window.history.replaceState(null, "", "/#gibt-es-nicht");
    await openApp();
    expect(screen.getByRole("tab", { name: "Workouts" })).toBeVisible();
  });
});
