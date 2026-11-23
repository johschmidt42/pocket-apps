import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExerciseSection } from "./exercise-section.tsx";

type Observed = (entries: { isIntersecting: boolean }[]) => void;

/** A browser clock under the control of the test, and cards that are on the screen or not. */
function stubBrowser() {
  let callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  const observers: Observed[] = [];
  const disconnect = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    callbacks.delete(id);
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Observed) {
        observers.push(callback);
      }
      observe() {
        // The test calls `show()`.
      }
      disconnect = disconnect;
    },
  );
  return {
    disconnect,
    waiting: () => callbacks.size,
    show: (isIntersecting: boolean) => {
      act(() => {
        for (const observed of observers) observed([{ isIntersecting }]);
      });
    },
    tick: (now: number) => {
      const due = [...callbacks.values()];
      callbacks = new Map();
      act(() => {
        for (const callback of due) callback(now);
      });
    },
  };
}

const figure = (name: string) => screen.getByRole("button", { name });
const THRUSTER = "Thruster von der Seite anhalten";

describe("ExerciseSection", () => {
  it("shows an animation for known exercises and a chip for the others", () => {
    render(<ExerciseSection exercises={["thruster", "pull-up", "ghd-sit-up"]} lines={[]} />);
    const cards = screen.getByRole("list", { name: "Animationen der Übungen" });
    expect(within(cards).getByRole("button", { name: THRUSTER })).toBeInTheDocument();
    expect(
      within(cards).getByRole("button", { name: "Pull-up Kipping von der Seite anhalten" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Übungen" })).getByText("GHD Sit-up"),
    ).toBeVisible();
  });

  it("shows only chips and no controls without an animation", () => {
    render(<ExerciseSection exercises={["ghd-sit-up"]} lines={[]} />);
    expect(screen.queryByRole("list", { name: "Animationen der Übungen" })).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has no chip list when each exercise has an animation", () => {
    render(<ExerciseSection exercises={["strict-pull-up"]} lines={[]} />);
    expect(screen.queryByRole("list", { name: "Übungen" })).not.toBeInTheDocument();
  });

  it("turns the view of one card and back", async () => {
    const user = userEvent.setup();
    render(<ExerciseSection exercises={["thruster", "pull-up"]} lines={[]} />);
    await user.click(screen.getByRole("button", { name: "Thruster von vorn zeigen" }));
    expect(figure("Thruster von vorn anhalten")).toBeInTheDocument();
    expect(figure("Pull-up Kipping von der Seite anhalten")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thruster von der Seite zeigen" }));
    expect(figure(THRUSTER)).toBeInTheDocument();
  });

  it("shows the rower from both sides", async () => {
    const user = userEvent.setup();
    render(<ExerciseSection exercises={["row", "thruster"]} lines={[]} />);
    await user.click(screen.getByRole("button", { name: "Row von vorn zeigen" }));
    expect(figure("Row von vorn anhalten")).toBeInTheDocument();
  });

  it("has no view button for an exercise with one view", () => {
    render(<ExerciseSection exercises={["push-up"]} lines={[]} />);
    expect(figure("Push-up von der Seite anhalten")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /zeigen$/ })).not.toBeInTheDocument();
  });

  it("moves the figure only while it is on the screen", () => {
    const browser = stubBrowser();
    const { unmount } = render(<ExerciseSection exercises={["thruster"]} lines={[]} />);
    expect(browser.waiting()).toBe(0);

    browser.show(true);
    const before = figure(THRUSTER).innerHTML;
    browser.tick(1000);
    browser.tick(1050);
    browser.tick(1100);
    expect(figure(THRUSTER).innerHTML).not.toBe(before);

    browser.show(false);
    expect(browser.waiting()).toBe(0);
    unmount();
    expect(browser.disconnect).toHaveBeenCalled();
  });

  it("stops one figure with a tap and goes on from the same place", async () => {
    const user = userEvent.setup();
    const browser = stubBrowser();
    render(<ExerciseSection exercises={["thruster", "strict-pull-up"]} lines={[]} />);
    browser.show(true);
    browser.tick(1000);
    browser.tick(1100);
    expect(browser.waiting()).toBe(2);

    await user.click(figure(THRUSTER));
    const stopped = figure("Thruster von der Seite abspielen");
    const paused = stopped.innerHTML;
    // The other figure goes on.
    expect(browser.waiting()).toBe(1);
    expect(figure("Strict Pull-up von der Seite anhalten")).toBeInTheDocument();

    await user.click(stopped);
    expect(figure(THRUSTER).innerHTML).toBe(paused);
    expect(browser.waiting()).toBe(2);
  });

  it("changes the speed of a figure in steps and comes back to full speed", async () => {
    const user = userEvent.setup();
    render(<ExerciseSection exercises={["thruster", "pull-up"]} lines={[]} />);
    await user.click(screen.getByRole("button", { name: "Tempo von Thruster: 1×" }));
    await user.click(screen.getByRole("button", { name: "Tempo von Thruster: 0,5×" }));
    await user.click(screen.getByRole("button", { name: "Tempo von Thruster: 0,25×" }));
    expect(screen.getByRole("button", { name: "Tempo von Thruster: 1×" })).toHaveTextContent("1×");
    // Each card has its own speed.
    expect(screen.getByRole("button", { name: "Tempo von Pull-up: 1×" })).toBeInTheDocument();
  });

  it("moves a figure at half speed half as far", async () => {
    const user = userEvent.setup();
    const browser = stubBrowser();
    const { unmount } = render(<ExerciseSection exercises={["thruster"]} lines={[]} />);
    browser.show(true);
    for (const now of [1000, 1100]) browser.tick(now);
    const full = figure(THRUSTER).innerHTML;
    unmount();

    render(<ExerciseSection exercises={["thruster"]} lines={[]} />);
    browser.show(true);
    await user.click(screen.getByRole("button", { name: "Tempo von Thruster: 1×" }));
    for (const now of [1000, 1100, 1200]) browser.tick(now);
    expect(figure(THRUSTER).innerHTML).toBe(full);
  });

  it("counts a long stall as one short step", () => {
    const browser = stubBrowser();
    const { unmount } = render(<ExerciseSection exercises={["thruster"]} lines={[]} />);
    browser.show(true);
    for (const now of [1000, 1100, 1200]) browser.tick(now);
    const afterTwoSteps = figure(THRUSTER).innerHTML;
    unmount();

    render(<ExerciseSection exercises={["thruster"]} lines={[]} />);
    browser.show(true);
    for (const now of [1000, 1100, 61_000]) browser.tick(now);
    expect(figure(THRUSTER).innerHTML).toBe(afterTwoSteps);
  });

  it("switches a general exercise between its forms", async () => {
    const user = userEvent.setup();
    render(<ExerciseSection exercises={["pull-up", "thruster"]} lines={[]} />);
    const forms = screen.getByRole("radiogroup", { name: "Variante von Pull-up" });
    expect(within(forms).getByRole("radio", { name: "Kipping" })).toBeChecked();
    const kipping = figure("Pull-up Kipping von der Seite anhalten").innerHTML;

    await user.click(within(forms).getByRole("radio", { name: "Strict" }));
    expect(within(forms).getByRole("radio", { name: "Strict" })).toBeChecked();
    expect(figure("Pull-up Strict von der Seite anhalten").innerHTML).not.toBe(kipping);
    // A click on the active form changes nothing.
    await user.click(within(forms).getByRole("radio", { name: "Strict" }));
    expect(figure("Pull-up Strict von der Seite anhalten")).toBeInTheDocument();
    // The other exercise has one form and no switch.
    expect(
      screen.queryByRole("radiogroup", { name: "Variante von Thruster" }),
    ).not.toBeInTheDocument();
  });

  it("has only the strict form when the text of the workout asks for it", () => {
    const { unmount } = render(<ExerciseSection exercises={["strict-pull-up"]} lines={[]} />);
    const expected = figure("Strict Pull-up von der Seite anhalten").innerHTML;
    unmount();
    render(<ExerciseSection exercises={["pull-up"]} lines={["9 strict pull-ups"]} />);
    expect(figure("Pull-up Strict von der Seite anhalten").innerHTML).toBe(expected);
    expect(screen.getByText("Pull-up Strict")).toBeVisible();
    expect(
      screen.queryByRole("radiogroup", { name: "Variante von Pull-up" }),
    ).not.toBeInTheDocument();
  });

  it("starts paused when the system asks for reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const browser = stubBrowser();
    render(<ExerciseSection exercises={["thruster"]} lines={[]} />);
    browser.show(true);
    expect(browser.waiting()).toBe(0);
    expect(figure("Thruster von der Seite abspielen")).toBeInTheDocument();
  });
});
