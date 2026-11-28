import { FIELD, TICK_SECONDS } from "../sim/field.ts";
import type { WeaponName } from "../content/weapons.ts";
import type { Input } from "../sim/input.ts";

/** "locked": the browser keeps the pointer. "free": the pointer is visible to the system, and Seven goes to it. */
export type PointerMode = "locked" | "free";

/** Turns the mouse and the keys into the input of the sim. */
export type Controls = {
  /** The input for the next tick. Call it once per tick. `x` and `y` are the position of Seven. */
  read: (x: number, y: number) => Input;
  /** Asks the browser to hide the pointer and to keep it in the window. Call it in a click. */
  lock: () => void;
  /** Gives the pointer back. */
  release: () => void;
  pointer: () => PointerMode;
  dispose: () => void;
};

/** The speed of Seven with the keys, in field units per second. */
const KEY_SPEED = 900;

/** After the user frees the pointer with Esc, Chrome refuses a new lock for about one second. */
const LOCK_RETRY_MILLISECONDS = 1300;

const KEYS_LEFT = ["ArrowLeft", "KeyA"];
const KEYS_RIGHT = ["ArrowRight", "KeyD"];
const KEYS_UP = ["ArrowUp", "KeyW"];
const KEYS_DOWN = ["ArrowDown", "KeyS"];
const KEYS_OF_THE_GAME = [...KEYS_LEFT, ...KEYS_RIGHT, ...KEYS_UP, ...KEYS_DOWN, "Space"];

/**
 * Listens on `element` (the picture of the field) and on the window.
 * `onPause` runs when the player leaves the game: the Esc key, a lost pointer lock, or another window.
 */
export function createControls(element: HTMLElement, onPause: () => void): Controls {
  /** The mouse moves since the last tick, in field units. Only with a locked pointer. */
  let pendingX = 0;
  let pendingY = 0;
  /** The place of the free pointer on the field. Seven goes there. */
  let target: { x: number; y: number } | null = null;
  let mouseFire = false;
  /** The weapon that the player chose with a key since the last tick. */
  let chosen: WeaponName | null = null;
  let wantLock = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const held = new Set<string>();

  const locked = () => document.pointerLockElement === element;
  const anyHeld = (codes: string[]) => codes.some((code) => held.has(code));

  const requestLock = async (): Promise<boolean> => {
    try {
      await element.requestPointerLock();
      return true;
    } catch {
      return false;
    }
  };

  const onMouseMove = (event: MouseEvent) => {
    const box = element.getBoundingClientRect();
    if (box.width === 0) return;
    const unitsPerPixel = FIELD.width / box.width;
    if (locked()) {
      pendingX += event.movementX * unitsPerPixel;
      pendingY -= event.movementY * unitsPerPixel;
    } else {
      target = {
        x: (event.clientX - box.left) * unitsPerPixel - FIELD.width / 2,
        y: FIELD.height / 2 - (event.clientY - box.top) * unitsPerPixel,
      };
    }
  };
  const onMouseDown = (event: MouseEvent) => {
    if (event.button === 0) mouseFire = true;
  };
  const onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) mouseFire = false;
  };
  // The right mouse button has no use yet. It must not open the menu of the browser in a game.
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    // With a locked pointer, a real browser takes the Esc key and ends the lock: then the change
    // of the lock pauses the game. If the key reaches the page, it pauses the game too.
    if (event.code === "Escape") onPause();
    if (event.code === "Digit1") chosen = "seeds";
    if (event.code === "Digit2") chosen = "spray";
    if (!KEYS_OF_THE_GAME.includes(event.code)) return;
    held.add(event.code);
    // With the keys, Seven does not go to the pointer.
    target = null;
  };
  const onKeyUp = (event: KeyboardEvent) => held.delete(event.code);
  const onLockChange = () => {
    if (locked()) {
      target = null;
    } else if (wantLock) {
      wantLock = false;
      onPause();
    }
  };
  const onBlur = () => {
    held.clear();
    mouseFire = false;
    onPause();
  };

  document.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  element.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  document.addEventListener("pointerlockchange", onLockChange);
  window.addEventListener("blur", onBlur);

  return {
    read(x, y) {
      let moveX = pendingX;
      let moveY = pendingY;
      pendingX = 0;
      pendingY = 0;
      if (target !== null && !locked()) {
        moveX += target.x - x;
        moveY += target.y - y;
      }
      const keyX = Number(anyHeld(KEYS_RIGHT)) - Number(anyHeld(KEYS_LEFT));
      const keyY = Number(anyHeld(KEYS_UP)) - Number(anyHeld(KEYS_DOWN));
      if (keyX !== 0 || keyY !== 0) {
        // The same speed in all directions, also on a diagonal.
        const distance = (KEY_SPEED * TICK_SECONDS) / Math.hypot(keyX, keyY);
        moveX += keyX * distance;
        moveY += keyY * distance;
      }
      const weapon = chosen;
      chosen = null;
      return { moveX, moveY, fire: mouseFire || held.has("Space"), weapon };
    },
    lock() {
      wantLock = true;
      void requestLock().then((success) => {
        if (success || !wantLock) return;
        // Until the lock works, the player has a free pointer, and Seven goes to it.
        clearTimeout(retry);
        retry = setTimeout(() => {
          if (wantLock && !locked()) void requestLock();
        }, LOCK_RETRY_MILLISECONDS);
      });
    },
    release() {
      wantLock = false;
      clearTimeout(retry);
      pendingX = 0;
      pendingY = 0;
      target = null;
      if (locked()) document.exitPointerLock();
    },
    pointer: () => (locked() ? "locked" : "free"),
    dispose() {
      wantLock = false;
      clearTimeout(retry);
      if (locked()) document.exitPointerLock();
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      element.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("blur", onBlur);
    },
  };
}
