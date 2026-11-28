import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TICK_SECONDS } from "../sim/field.ts";
import { createControls, type Controls } from "./controls.ts";

let controls: Controls | undefined;

afterEach(() => {
  controls?.dispose();
  controls = undefined;
  document.body.replaceChildren();
});

/** The picture of the field is 800 x 450 pixels at the top left of the window: 2 field units per pixel. */
function setup() {
  const element = document.createElement("div");
  document.body.append(element);
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 450,
    width: 800,
    height: 450,
    toJSON: () => ({}),
  });
  const onPause = vi.fn();
  controls = createControls(element, onPause);
  return { element, onPause, controls, user: userEvent.setup() };
}

/**
 * jsdom has no Pointer Lock API. This copy acts like Chrome: a lock sets the locked element
 * and sends "pointerlockchange". `refuse` makes the browser say no.
 */
function fakePointerLock(element: HTMLElement, { refuse = false } = {}) {
  let locked: Element | null = null;
  const change = (next: Element | null) => {
    locked = next;
    document.dispatchEvent(new Event("pointerlockchange"));
  };
  Object.defineProperty(document, "pointerLockElement", { configurable: true, get: () => locked });
  const request = vi.fn(() => {
    if (refuse) return Promise.reject(new Error("The user left the lock a moment ago."));
    change(element);
    return Promise.resolve();
  });
  element.requestPointerLock = request;
  document.exitPointerLock = vi.fn(() => {
    change(null);
  });
  return {
    request,
    loseLock: () => {
      change(null);
    },
    lockedElement: () => locked,
  };
}

/** A move of the locked mouse. jsdom does not know `movementX` and `movementY`. */
function lockedMove(x: number, y: number): void {
  const event = new MouseEvent("mousemove");
  Object.defineProperty(event, "movementX", { value: x });
  Object.defineProperty(event, "movementY", { value: y });
  document.dispatchEvent(event);
}

describe("with a free mouse pointer", () => {
  it("does nothing when the player does nothing", () => {
    const { controls } = setup();
    expect(controls.read(10, 20)).toEqual({
      moveX: 0,
      moveY: 0,
      fire: false,
      weapon: null,
    });
    expect(controls.pointer()).toBe("free");
  });

  it("moves Seven to the place of the pointer on the field", async () => {
    const { controls, element, user } = setup();
    // The pixel 600 / 112.5 is the field place 400 / 225.
    await user.pointer({ target: element, coords: { clientX: 600, clientY: 112.5 } });
    expect(controls.read(100, 50)).toMatchObject({ moveX: 300, moveY: 175 });
    // Seven is there now. He stays.
    expect(controls.read(400, 225)).toMatchObject({ moveX: 0, moveY: 0 });
  });

  it("moves Seven with the keys, with the same speed in all directions", async () => {
    const { controls, user } = setup();
    const step = 900 * TICK_SECONDS;
    await user.keyboard("{d>}");
    expect(controls.read(0, 0)).toMatchObject({ moveX: step, moveY: 0 });
    await user.keyboard("{w>}");
    const diagonal = controls.read(0, 0);
    expect(diagonal.moveX).toBeCloseTo(step / Math.SQRT2);
    expect(diagonal.moveY).toBeCloseTo(step / Math.SQRT2);
    await user.keyboard("{/d}{/w}{ArrowLeft>}{ArrowDown>}");
    const back = controls.read(0, 0);
    expect(back.moveX).toBeLessThan(0);
    expect(back.moveY).toBeLessThan(0);
    await user.keyboard("{/ArrowLeft}{/ArrowDown}");
    expect(controls.read(0, 0)).toMatchObject({ moveX: 0, moveY: 0 });
  });

  it("stops the flight to the pointer when the player uses the keys", async () => {
    const { controls, element, user } = setup();
    await user.pointer({ target: element, coords: { clientX: 600, clientY: 112.5 } });
    await user.keyboard("{a}");
    expect(controls.read(0, 0)).toMatchObject({ moveX: 0, moveY: 0 });
  });

  it("uses the weapon with the left mouse button or the space key", async () => {
    const { controls, element, user } = setup();
    await user.pointer({ keys: "[MouseLeft>]", target: element });
    expect(controls.read(0, 0).fire).toBe(true);
    await user.pointer({ keys: "[/MouseLeft]", target: element });
    expect(controls.read(0, 0).fire).toBe(false);
    await user.keyboard("{ >}");
    expect(controls.read(0, 0).fire).toBe(true);
    await user.keyboard("{/ }");
    expect(controls.read(0, 0).fire).toBe(false);
  });

  it("does not open the menu of the browser with the right mouse button", () => {
    const { element } = setup();
    const menu = new MouseEvent("contextmenu", { cancelable: true });
    element.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
  });

  it("changes the weapon with the keys 1 and 2, one time per key", async () => {
    const { controls, user } = setup();
    await user.keyboard("2");
    expect(controls.read(0, 0).weapon).toBe("seeds");
    expect(controls.read(0, 0).weapon).toBeNull();
    await user.keyboard("1");
    expect(controls.read(0, 0).weapon).toBe("spray");
  });

  it("pauses with the Esc key and when the window loses the focus", async () => {
    const { controls, onPause, user } = setup();
    await user.keyboard("{Escape}");
    expect(onPause).toHaveBeenCalledTimes(1);

    await user.keyboard("{d>}{ >}");
    window.dispatchEvent(new Event("blur"));
    expect(onPause).toHaveBeenCalledTimes(2);
    // The keys are not down in the other window.
    expect(controls.read(0, 0)).toMatchObject({ moveX: 0, fire: false });
  });

  it("stays free and tries again when the browser refuses the lock", async () => {
    const { controls, element } = setup();
    const { request } = fakePointerLock(element, { refuse: true });
    controls.lock();
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });
    expect(controls.pointer()).toBe("free");
    // Chrome allows a new lock about one second after the user left the last one.
    await vi.waitFor(
      () => {
        expect(request).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 },
    );
  });

  it("does not try again after the game gave the pointer back", async () => {
    const { controls, element } = setup();
    const { request } = fakePointerLock(element, { refuse: true });
    controls.lock();
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });
    controls.release();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("ignores the player after its end", async () => {
    const { controls, element, user } = setup();
    controls.dispose();
    await user.keyboard("{d>}2");
    await user.pointer({ keys: "[MouseLeft>]", target: element });
    expect(controls.read(0, 0)).toEqual({
      moveX: 0,
      moveY: 0,
      fire: false,
      weapon: null,
    });
  });
});

describe("with a locked mouse pointer", () => {
  it("moves Seven by the moves of the mouse since the last tick", async () => {
    const { controls, element } = setup();
    fakePointerLock(element);
    controls.lock();
    await vi.waitFor(() => {
      expect(controls.pointer()).toBe("locked");
    });
    lockedMove(10, 5);
    lockedMove(20, -15);
    // 2 field units per pixel. A move down on the screen is a move down on the field.
    expect(controls.read(0, 0)).toMatchObject({ moveX: 60, moveY: 20 });
    expect(controls.read(0, 0)).toMatchObject({ moveX: 0, moveY: 0 });
  });

  it("forgets the place of the free pointer", async () => {
    const { controls, element, user } = setup();
    fakePointerLock(element);
    await user.pointer({ target: element, coords: { clientX: 600, clientY: 112.5 } });
    controls.lock();
    await vi.waitFor(() => {
      expect(controls.pointer()).toBe("locked");
    });
    expect(controls.read(0, 0)).toMatchObject({ moveX: 0, moveY: 0 });
  });

  it("pauses when the player leaves the lock, and not for the Esc key itself", async () => {
    const { controls, element, onPause, user } = setup();
    const { loseLock } = fakePointerLock(element);
    controls.lock();
    await vi.waitFor(() => {
      expect(controls.pointer()).toBe("locked");
    });
    // The browser takes the Esc key: it ends the lock.
    await user.keyboard("{Escape}");
    expect(onPause).not.toHaveBeenCalled();
    loseLock();
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(controls.pointer()).toBe("free");
  });

  it("gives the pointer back and does not pause for that", async () => {
    const { controls, element, onPause } = setup();
    fakePointerLock(element);
    controls.lock();
    await vi.waitFor(() => {
      expect(controls.pointer()).toBe("locked");
    });
    lockedMove(50, 0);
    controls.release();
    expect(controls.pointer()).toBe("free");
    expect(onPause).not.toHaveBeenCalled();
    expect(controls.read(0, 0)).toMatchObject({ moveX: 0, moveY: 0 });
  });

  it("gives the pointer back at its end", async () => {
    const { controls, element } = setup();
    const { lockedElement } = fakePointerLock(element);
    controls.lock();
    await vi.waitFor(() => {
      expect(controls.pointer()).toBe("locked");
    });
    controls.dispose();
    expect(lockedElement()).toBeNull();
  });
});
