import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { Ray } from "./mouse-effects.ts";
import type { Palette } from "./palettes.ts";
import type { StageView, ViewFactory } from "./webgl-view.ts";

const RAY: Ray = { origin: [0, 0, -5], direction: [0, 0, 1] };

/** A view without WebGL. It records what the app asks for. */
function fakeFactory(supported = true) {
  const views: ReturnType<typeof fakeView>[] = [];
  function fakeView() {
    return {
      setCameraAngle: vi.fn<(angle: number) => void>(),
      rayAt: vi.fn<(x: number, y: number) => Ray>(() => RAY),
      draw: vi.fn<(points: Float32Array) => void>(),
      setPalette: vi.fn<(palette: Palette) => void>(),
      resize: vi.fn<(width: number, height: number) => void>(),
      dispose: vi.fn<() => void>(),
    } satisfies StageView;
  }
  const factory: ViewFactory = {
    supported: () => supported,
    create: () => {
      const view = fakeView();
      views.push(view);
      return view;
    },
  };
  return { factory, views };
}

/** jsdom has no layout. The picture gets a size, so that the pointer has a position. */
function givePictureASize() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 640,
    bottom: 400,
    width: 640,
    height: 400,
    toJSON: () => ({}),
  });
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
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    value: function (this: HTMLElement) {
      if (refuse) return Promise.reject(new TypeError("Permissions check failed"));
      change(this);
      return Promise.resolve();
    },
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: () => {
      if (element === null) return Promise.reject(new TypeError("Not in full screen"));
      change(null);
      return Promise.resolve();
    },
  });
  return {
    /** The element in full screen, or null. */
    current: () => element,
    /** The user presses Esc. */
    pressEscape: () => {
      change(null);
    },
  };
}

afterEach(() => {
  for (const name of ["fullscreenEnabled", "fullscreenElement", "exitFullscreen"]) {
    Reflect.deleteProperty(document, name);
  }
  Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
});

async function openAttractor(name: string, supported = true) {
  const user = userEvent.setup();
  const fake = fakeFactory(supported);
  render(<App viewFactory={fake.factory} />);
  await user.click(screen.getByRole("button", { name }));
  return { user, ...fake };
}

describe("App", () => {
  it("shows the gallery with six attractors", () => {
    render(<App viewFactory={fakeFactory().factory} />);
    expect(screen.getByRole("heading", { level: 2, name: "Ausgangszustand wählen" })).toBeVisible();
    for (const name of ["Aizawa", "Lorenz", "Thomas", "Halvorsen", "Rössler", "Dadras"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeVisible();
    }
  });

  it("opens an attractor with its own colors and the lens", async () => {
    const { views } = await openAttractor("Lorenz");
    expect(screen.getByRole("heading", { level: 2, name: "Lorenz" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Animation des Attraktors Lorenz" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Linse" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Eis" })).toBeChecked();
    expect(screen.getByText("Farben: Eis")).toBeVisible();
    expect(views).toHaveLength(1);
    expect(views[0]!.setPalette).toHaveBeenLastCalledWith(expect.objectContaining({ id: "eis" }));
  });

  it("draws frames and shows the parameters", async () => {
    const { views } = await openAttractor("Lorenz");
    await waitFor(() => {
      expect(views[0]!.draw).toHaveBeenCalled();
    });
    expect(await screen.findByText("σ 10,000 · ρ 28,000 · β 2,667 · Kraft 0,00")).toBeVisible();
  });

  it("changes the effect of the mouse", async () => {
    const { user } = await openAttractor("Aizawa");
    await user.click(screen.getByRole("radio", { name: "Schwerkraft" }));
    expect(screen.getByRole("radio", { name: "Schwerkraft" })).toBeChecked();
    expect(screen.getByText(/Die Maus zieht an den Punkten/)).toBeVisible();

    await user.click(screen.getByRole("radio", { name: "Gummi" }));
    expect(screen.getByText("Die Linien folgen der Maus und federn zurück.")).toBeVisible();
  });

  it("keeps the effect when the selected effect is clicked again", async () => {
    const { user } = await openAttractor("Aizawa");
    await user.click(screen.getByRole("radio", { name: "Linse" }));
    expect(screen.getByRole("radio", { name: "Linse" })).toBeChecked();
  });

  it("changes the colors and keeps them for the next attractor", async () => {
    const { user, views } = await openAttractor("Aizawa");
    await user.click(screen.getByRole("radio", { name: "Regenbogen" }));
    expect(screen.getByText("Farben: Regenbogen")).toBeVisible();
    expect(views[0]!.setPalette).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "regenbogen" }),
    );

    // A click on the selected palette keeps it.
    await user.click(screen.getByRole("radio", { name: "Regenbogen" }));
    expect(screen.getByText("Farben: Regenbogen")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Galerie" }));
    await user.click(screen.getByRole("button", { name: "Thomas" }));
    expect(screen.getByRole("radio", { name: "Regenbogen" })).toBeChecked();
  });

  it("pulls with the mouse and lets go when the mouse leaves", async () => {
    givePictureASize();
    const { user, views } = await openAttractor("Aizawa");
    const picture = screen.getByRole("img", { name: "Animation des Attraktors Aizawa" });

    await user.pointer({ target: picture, coords: { clientX: 320, clientY: 200 } });
    await waitFor(() => {
      expect(views[0]!.rayAt).toHaveBeenCalledWith(0, 0);
    });
    expect(
      await screen.findByText(/Kraft 0,[5-9]|Kraft 1,00/, {}, { timeout: 3000 }),
    ).toBeVisible();

    await user.pointer({ keys: "[MouseLeft>]", target: picture });
    expect(await screen.findByText(/Kraft [12],[0-9]{2}$/, {}, { timeout: 3000 })).toBeVisible();
    await user.pointer({ keys: "[/MouseLeft]", target: picture });

    await user.unhover(picture);
    expect(await screen.findByText(/Kraft 0,0[0-9]$/, {}, { timeout: 3000 })).toBeVisible();
  });

  it("starts the scene again with the reset button", async () => {
    const { user, views } = await openAttractor("Aizawa");
    await user.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    // The same view goes on. Only the lines start again.
    expect(views).toHaveLength(1);
    expect(views[0]!.dispose).not.toHaveBeenCalled();
  });

  it("explains the app and the formulas in folded sections", async () => {
    const { user } = await openAttractor("Lorenz");
    expect(screen.queryByText("dx/dt = σ·(y − x)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wie funktioniert das?" }));
    expect(screen.getByText(/Die App startet 225 Punkte/)).toBeVisible();
    expect(screen.getByText(/2,5 mit gedrückter Maustaste/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Formeln und Parameter von Lorenz" }));
    expect(screen.getByText("dx/dt = σ·(y − x)")).toBeVisible();
    expect(screen.getByText(/Ab etwa 24,7 gibt es Chaos/)).toBeVisible();
  });

  it("names the buttons on the picture in a tooltip", async () => {
    const { user } = await openAttractor("Aizawa");
    await user.hover(screen.getByRole("button", { name: "Zurücksetzen" }));
    expect(await screen.findByRole("tooltip", { name: "Zurücksetzen" })).toBeInTheDocument();
  });

  it("goes back to the gallery and frees the graphics", async () => {
    const { user, views } = await openAttractor("Halvorsen");
    await user.click(screen.getByRole("button", { name: "Galerie" }));
    expect(screen.getByRole("heading", { level: 2, name: "Ausgangszustand wählen" })).toBeVisible();
    expect(views[0]!.dispose).toHaveBeenCalled();
  });

  it("gives the picture its new size", async () => {
    let notify = () => {
      // Set by the observer below.
    };
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {
          // The test calls notify().
        }
        disconnect() {
          // Nothing to clean up.
        }
      },
    );
    const { views } = await openAttractor("Rössler");
    act(() => {
      notify();
    });
    expect(views[0]!.resize).toHaveBeenCalledWith(0, 0);
  });

  it("shows the picture in full screen and leaves it with the button", async () => {
    const browser = fakeFullscreen();
    const { user } = await openAttractor("Aizawa");

    await user.click(screen.getByRole("button", { name: "Vollbild" }));

    const picture = screen.getByRole("img", { name: "Animation des Attraktors Aizawa" });
    expect(browser.current()).toContainElement(picture);
    expect(picture).toHaveClass("h-screen");
    // The buttons stay on the picture in full screen.
    expect(screen.getByRole("button", { name: "Zurücksetzen" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Vollbild beenden" }));

    expect(browser.current()).toBeNull();
    expect(screen.queryByRole("button", { name: "Vollbild beenden" })).not.toBeInTheDocument();
    expect(picture).toHaveClass("h-[60vh]");
  });

  it("leaves the full screen when the user presses Esc", async () => {
    const browser = fakeFullscreen();
    const { user } = await openAttractor("Aizawa");
    await user.click(screen.getByRole("button", { name: "Vollbild" }));
    expect(screen.getByRole("button", { name: "Vollbild beenden" })).toBeVisible();

    act(() => {
      browser.pressEscape();
    });

    expect(screen.queryByRole("button", { name: "Vollbild beenden" })).not.toBeInTheDocument();
  });

  it("stays in the page when the browser refuses the full screen", async () => {
    fakeFullscreen({ refuse: true });
    const { user } = await openAttractor("Aizawa");
    await user.click(screen.getByRole("button", { name: "Vollbild" }));
    expect(screen.queryByRole("button", { name: "Vollbild beenden" })).not.toBeInTheDocument();
  });

  it("ignores the end of a full screen that ended already", async () => {
    const browser = fakeFullscreen();
    const { user } = await openAttractor("Aizawa");
    await user.click(screen.getByRole("button", { name: "Vollbild" }));
    const exit = screen.getByRole("button", { name: "Vollbild beenden" });
    // The full screen ends, but React has not yet removed the button.
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: () => Promise.reject(new TypeError("Not in full screen")),
    });
    await user.click(exit);
    act(() => {
      browser.pressEscape();
    });
    expect(screen.queryByRole("button", { name: "Vollbild beenden" })).not.toBeInTheDocument();
  });

  it("shows no full-screen button when the browser cannot do it", async () => {
    await openAttractor("Aizawa");
    expect(screen.queryByRole("button", { name: "Vollbild" })).not.toBeInTheDocument();
  });

  it("shows a notice without WebGL", async () => {
    await openAttractor("Dadras", false);
    expect(screen.getByText("Keine 3D-Grafik")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Zurücksetzen" })).not.toBeInTheDocument();
  });
});
