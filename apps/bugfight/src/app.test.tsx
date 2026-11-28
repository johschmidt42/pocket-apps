import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { View, ViewFactory } from "./render/view.ts";

/** A picture without WebGL. It records what the app asks for. */
function fakeFactory(supported = true) {
  const views: ReturnType<typeof fakeView>[] = [];
  function fakeView(container: HTMLElement) {
    const canvas = document.createElement("canvas");
    container.append(canvas);
    return {
      canvas,
      update: vi.fn<View["update"]>(),
      draw: vi.fn<View["draw"]>(),
      reset: vi.fn<View["reset"]>(),
      dispose: vi.fn<View["dispose"]>(),
    } satisfies View;
  }
  const factory: ViewFactory = {
    supported: () => supported,
    create: (container) => {
      const view = fakeView(container);
      views.push(view);
      return view;
    },
  };
  return { factory, views };
}

/**
 * jsdom has no Fullscreen API. This copy acts like Chrome: it sets the full-screen element
 * and sends "fullscreenchange". `refuse` makes the browser say no.
 */
function fakeFullscreen({ refuse = false } = {}) {
  let element: Element | null = null;
  function change(next: Element | null) {
    element = next;
    document.dispatchEvent(new Event("fullscreenchange"));
  }
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => element });
  document.documentElement.requestFullscreen = vi.fn(() => {
    if (refuse) return Promise.reject(new Error("The browser refused."));
    change(document.documentElement);
    return Promise.resolve();
  });
  document.exitFullscreen = vi.fn(() => {
    change(null);
    return Promise.resolve();
  });
}

function setup(options: { supported?: boolean } = {}) {
  const { factory, views } = fakeFactory(options.supported);
  const user = userEvent.setup();
  const { unmount } = render(<App viewFactory={factory} />);
  return { user, views, unmount };
}

const lives = (count: number) =>
  screen.findByRole("img", { name: `Leben: ${String(count)} von 7 Punkten` });

describe("bugfight", () => {
  it("shows the header of the app and the title of the game", async () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "Test-App" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "Bugfight" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start" })).toBeVisible();
    // The displays of the game come with the game.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("starts the game with the button and shows the spots, the stones and the score", async () => {
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Start" }));
    expect(await lives(7)).toBeVisible();
    // Seven starts with the "Kernspucker".
    expect(screen.getByRole("img", { name: "Kerne: 24 von 24" })).toBeVisible();
    expect(screen.getByText("Pollen: 0")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Bugfight" })).not.toBeInTheDocument();
  });

  it("starts with the Enter key, pauses with Esc and goes on with the button", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: "Start" });
    await user.keyboard("{Enter}");
    await lives(7);

    await user.keyboard("{Escape}");
    expect(await screen.findByRole("heading", { level: 2, name: "Pause" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Pause" })).not.toBeInTheDocument();
    });
    expect(await lives(7)).toBeVisible();
  });

  it("goes back to the title from the pause", async () => {
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "Hauptmenü" }));
    expect(await screen.findByRole("heading", { name: "Bugfight" })).toBeVisible();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("presses a button that has the focus with the Enter key, and not the main button", async () => {
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.keyboard("{Escape}");
    (await screen.findByRole("button", { name: "Hauptmenü" })).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: "Bugfight" })).toBeVisible();
  });

  it("shows the tank of the gas after the key 2, and the stones again after the key 1", async () => {
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await lives(7);
    await user.keyboard("2");
    expect(await screen.findByRole("progressbar", { name: "Druck im Tank" })).toBeVisible();
    expect(screen.queryByRole("img", { name: /^Kerne/ })).not.toBeInTheDocument();
    await user.keyboard("1");
    expect(await screen.findByRole("img", { name: "Kerne: 24 von 24" })).toBeVisible();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("opens the debug panel with the key # and uses its tools", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: "Start" });
    expect(screen.queryByRole("complementary", { name: "Debug" })).not.toBeInTheDocument();
    await user.keyboard("#");
    const panel = await screen.findByRole("complementary", { name: "Debug" });
    expect(panel).toHaveTextContent("Gegner40");
    expect(panel).toHaveTextContent("Mauszeigerfrei");

    const immortal = screen.getByRole("checkbox", { name: "Unverwundbar" });
    await user.click(immortal);
    expect(immortal).toBeChecked();
    const areas = screen.getByRole("checkbox", { name: "Trefferzonen zeigen" });
    await user.click(areas);
    expect(areas).toBeChecked();

    await user.click(screen.getByRole("button", { name: "0.5×" }));
    expect(screen.getByRole("button", { name: "0.5×" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "1×" })).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "7" }));
    expect(screen.getByRole("button", { name: "7" })).toHaveAttribute("aria-pressed", "true");

    // A single tick is only possible in the pause.
    const tick = screen.getByRole("button", { name: "Ein Tick weiter" });
    expect(tick).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Start" }));
    await user.keyboard("{Escape}");
    await screen.findByRole("heading", { name: "Pause" });
    expect(tick).toBeEnabled();
    const before = panel.textContent;
    await user.click(tick);
    expect(panel.textContent).not.toBe(before);

    await user.keyboard("{F1}");
    expect(screen.queryByRole("complementary", { name: "Debug" })).not.toBeInTheDocument();
  });

  it("reads the options from the address", async () => {
    window.history.replaceState(null, "", "?debug&weapon=spray&spots=3");
    const { user } = setup();
    expect(await screen.findByRole("complementary", { name: "Debug" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(await lives(3)).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Druck im Tank" })).toBeVisible();
  });

  it("shows a message in a browser with no WebGL 2", () => {
    const { views } = setup({ supported: false });
    expect(screen.getByText("Das Spiel braucht WebGL 2")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(views).toHaveLength(0);
  });

  it("frees the picture when the app closes", async () => {
    const { views, unmount } = setup();
    await screen.findByRole("button", { name: "Start" });
    unmount();
    expect(views[0]?.dispose).toHaveBeenCalledOnce();
  });
});

describe("the full screen", () => {
  it("has no button in a browser with no Fullscreen API", async () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: false });
    setup();
    await screen.findByRole("button", { name: "Start" });
    expect(screen.queryByRole("button", { name: "Vollbild" })).not.toBeInTheDocument();
  });

  it("covers the page with the game, and a button leads back", async () => {
    fakeFullscreen();
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Vollbild" }));
    expect(await screen.findByRole("button", { name: "Vollbild beenden" })).toBeVisible();
    expect(screen.getByRole("main")).toHaveClass("fixed");

    await user.click(screen.getByRole("button", { name: "Vollbild beenden" }));
    expect(await screen.findByRole("button", { name: "Vollbild" })).toBeVisible();
    expect(screen.getByRole("main")).not.toHaveClass("fixed");
  });

  it("stays in the page when the browser refuses", async () => {
    fakeFullscreen({ refuse: true });
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Vollbild" }));
    expect(screen.getByRole("button", { name: "Vollbild" })).toBeVisible();
    expect(screen.getByRole("main")).not.toHaveClass("fixed");
  });

  it("has no button during the game, because the browser keeps the mouse pointer", async () => {
    fakeFullscreen();
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await lives(7);
    expect(screen.queryByRole("button", { name: "Vollbild" })).not.toBeInTheDocument();
  });
});
