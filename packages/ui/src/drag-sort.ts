import {
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { flushSync } from "react-dom";

// Drag and drop to change the order of a list, with a grip handle (`drag-handle.tsx`).
// Own code, not vendor code. Used by the launcher, app-ideen, lebenslauf and trainingsbuch.
// A mouse uses the drag API of the browser. A finger or a pen uses pointer events: the row
// moves through the list while the finger moves, like in the apps of a phone.

/** -1 moves an item up (to the front), 1 moves it down (to the end). */
export type Direction = -1 | 1;

/** Swaps the item with its neighbor. Keeps the list if the item is missing or at the edge. */
export function moveById<T extends { id: string }>(
  list: readonly T[],
  id: string,
  direction: Direction,
): T[] {
  const index = list.findIndex((entry) => entry.id === id);
  const other = index + direction;
  const item = list[index];
  const neighbor = list[other];
  if (!item || !neighbor) return [...list];
  const result = [...list];
  result[index] = neighbor;
  result[other] = item;
  return result;
}

/** Where a dragged item goes: before or after the item under the mouse. */
export type DropPosition = "before" | "after";

/**
 * Moves the item `draggedId` before or after the item `targetId`.
 * Keeps the list if an ID is missing or if both IDs are the same.
 */
export function moveTo<T extends { id: string }>(
  list: readonly T[],
  draggedId: string,
  targetId: string,
  position: DropPosition,
): T[] {
  const item = list.find((entry) => entry.id === draggedId);
  const rest = list.filter((entry) => entry.id !== draggedId);
  const index = rest.findIndex((entry) => entry.id === targetId);
  if (!item || index < 0) return [...list];
  rest.splice(position === "before" ? index : index + 1, 0, item);
  return rest;
}

/** The ID of the hidden hint for the drag handles. Render `<SortHint />` once per page. */
export const SORT_HINT_ID = "sort-hint";

/** The mark of a row. The drag image of a handle is its row. */
const ROW_ATTRIBUTE = "data-sort-row";

/** An own data type. Text fields accept a drop of "text/plain", but not of this type. */
const DRAG_TYPE = "application/x-pocket-apps-sort";

/** A line above or below the row under the mouse shows where the dragged row goes. */
const LINE_BEFORE =
  "before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:rounded-full before:bg-primary";
const LINE_AFTER =
  "after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary";

/** "before" if the mouse is in the upper half of the row, else "after". */
export function dropPosition(clientY: number, row: { top: number; height: number }): DropPosition {
  return clientY < row.top + row.height / 2 ? "before" : "after";
}

/**
 * The step of a row under a finger at `y`: -1 if the finger is above the middle of the row
 * before, 1 if it is below the middle of the row after, else `null`.
 */
export function stepToward(
  y: number,
  before: { top: number; height: number } | null,
  after: { top: number; height: number } | null,
): Direction | null {
  if (before && y < before.top + before.height / 2) return -1;
  if (after && y > after.top + after.height / 2) return 1;
  return null;
}

/** The width of the zone at the top and the bottom of a scroll area that scrolls (px). */
const SCROLL_ZONE = 64;
/** The most pixels of a scroll in one frame. */
const MAX_SCROLL = 16;

/**
 * The scroll of one frame while a finger drags at `y` in an area from `top` to `bottom`:
 * negative near the top, positive near the bottom, faster near the edge. 0 in the middle.
 */
export function scrollSpeed(y: number, top: number, bottom: number): number {
  const depth =
    y < top + SCROLL_ZONE
      ? y - (top + SCROLL_ZONE)
      : y > bottom - SCROLL_ZONE
        ? y - (bottom - SCROLL_ZONE)
        : 0;
  return Math.max(-MAX_SCROLL, Math.min(MAX_SCROLL, Math.round(depth / 4)));
}

/** The element that scrolls a row: the nearest parent with a scroll bar, or the page. */
function scrollArea(row: HTMLElement): { element: Element; top: number; bottom: number } {
  for (let parent = row.parentElement; parent; parent = parent.parentElement) {
    const overflow = getComputedStyle(parent).overflowY;
    if (
      (overflow === "auto" || overflow === "scroll") &&
      parent.scrollHeight > parent.clientHeight
    ) {
      const box = parent.getBoundingClientRect();
      return { element: parent, top: box.top, bottom: box.bottom };
    }
  }
  return {
    element: document.scrollingElement ?? document.documentElement,
    top: 0,
    bottom: window.innerHeight,
  };
}

/** The rows of the list of `row`, in their order on the page. */
function rowsOf(row: HTMLElement): Element[] {
  return row.parentElement
    ? [...row.parentElement.querySelectorAll(`:scope > [${ROW_ATTRIBUTE}]`)]
    : [];
}

/** The DOM ID of the drag handle of an item. */
export function dragHandleId(id: string): string {
  return `drag-${id}`;
}

type DragState = {
  draggedId: string;
  target: { id: string; position: DropPosition } | null;
  /** `true` for a finger or a pen: the row moves at once, and no line shows. */
  touch: boolean;
};

/** A drag with a finger: the row, the last place of the finger and the frame of the scroll. */
type TouchDrag = { id: string; row: HTMLElement; y: number; frame: number };

export type DragSortActions = {
  /** The user dropped `draggedId` before or after `targetId`. */
  onDrop: (draggedId: string, targetId: string, position: DropPosition) => void;
  /** The user pressed an arrow key on the handle of `id`. */
  onStep: (id: string, direction: Direction) => void;
};

/**
 * Drag and drop for one list. Give each row `rowProps(id)` and `rowClass(id)`, its handle
 * `handleProps(id)`, and the element around the rows `listProps()`. The rows of one list must
 * be children of the same element. Each list has its own state. Thus a row of another list
 * cannot be dropped here. The arrow keys on a handle move its row one step.
 *
 * A mouse uses the drag API of the browser. A finger or a pen uses pointer events: each time
 * the finger passes the middle of the next row, `onStep` moves the row one step. Near the top
 * or the bottom of the scroll area, the list scrolls.
 */
export function useDragSort({ onDrop, onStep }: DragSortActions) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const touchDrag = useRef<TouchDrag | null>(null);
  // A drag with a finger calls `onStep` from listeners of the window. They need the functions
  // of the latest render: the order of the list changes with each step.
  const actions = useRef({ onDrop, onStep });
  useLayoutEffect(() => {
    actions.current = { onDrop, onStep };
  });

  /** Moves the row step by step until it is under the finger. */
  function follow(session: TouchDrag): void {
    // At most one step per row: the finger cannot pass more rows than the list has.
    for (let steps = rowsOf(session.row).length; steps > 0; steps -= 1) {
      const current = rowsOf(session.row);
      const index = current.indexOf(session.row);
      const before = current[index - 1]?.getBoundingClientRect() ?? null;
      const after = current[index + 1]?.getBoundingClientRect() ?? null;
      const direction = stepToward(session.y, before, after);
      if (direction === null) return;
      flushSync(() => {
        actions.current.onStep(session.id, direction);
      });
      // The app did not move the row, for example at the edge of a group.
      if (rowsOf(session.row).indexOf(session.row) === index) return;
    }
  }

  function startTouch(id: string, row: HTMLElement, pointerId: number, y: number): void {
    const session: TouchDrag = { id, row, y, frame: 0 };
    touchDrag.current = session;
    const scroll = () => {
      const area = scrollArea(row);
      const speed = scrollSpeed(session.y, area.top, area.bottom);
      if (speed !== 0) {
        area.element.scrollBy(0, speed);
        follow(session);
      }
      session.frame = window.requestAnimationFrame(scroll);
    };
    const move = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      session.y = event.clientY;
      follow(session);
    };
    const end = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.cancelAnimationFrame(session.frame);
      touchDrag.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    session.frame = window.requestAnimationFrame(scroll);
    setDrag({ draggedId: id, target: null, touch: true });
    // A short buzz on Android, like the lift of a row in a native app. iOS has no vibration.
    if ("vibrate" in navigator) navigator.vibrate(10);
  }

  function handleProps(id: string) {
    return {
      id: dragHandleId(id),
      draggable: true,
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        // A mouse uses the drag API of the browser (`onDragStart`).
        if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
        const row = event.currentTarget.closest<HTMLElement>(`[${ROW_ATTRIBUTE}]`);
        if (!row) return;
        // No text selection and no drag of the browser.
        event.preventDefault();
        startTouch(id, row, event.pointerId, event.clientY);
      },
      onDragStart: (event: DragEvent<HTMLElement>) => {
        // A finger already moves the row.
        if (touchDrag.current) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(DRAG_TYPE, id);
        const row = event.currentTarget.closest(`[${ROW_ATTRIBUTE}]`);
        if (row) {
          const box = row.getBoundingClientRect();
          event.dataTransfer.setDragImage(row, event.clientX - box.left, event.clientY - box.top);
        }
        // Chrome takes the drag image after this handler. The row fades only after that.
        window.setTimeout(() => {
          setDrag({ draggedId: id, target: null, touch: false });
        }, 0);
      },
      onDragEnd: () => {
        setDrag(null);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        const direction = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : null;
        if (direction === null) return;
        event.preventDefault();
        flushSync(() => {
          onStep(id, direction);
        });
        // React can move the row in the DOM. The handle keeps the keyboard focus.
        document.getElementById(dragHandleId(id))?.focus();
      },
    };
  }

  function rowProps(id: string) {
    return {
      [ROW_ATTRIBUTE]: "",
      onDragOver: (event: DragEvent<HTMLElement>) => {
        // A row of another list: let the event go on to that list.
        if (!drag) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        const position = dropPosition(event.clientY, event.currentTarget.getBoundingClientRect());
        const target = id === drag.draggedId ? null : { id, position };
        if (target?.id !== drag.target?.id || target?.position !== drag.target?.position) {
          setDrag({ ...drag, target });
        }
      },
    };
  }

  /**
   * The props of the element around all rows of the list. Thus a drop also works in the gaps
   * between the rows: it goes to the last place that the line showed. When the mouse leaves
   * the list, the line goes away.
   */
  function listProps() {
    return {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!drag) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        if (!drag?.target) return;
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setDrag({ ...drag, target: null });
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!drag) return;
        event.preventDefault();
        event.stopPropagation();
        if (drag.target) onDrop(drag.draggedId, drag.target.id, drag.target.position);
        setDrag(null);
      },
    };
  }

  /**
   * The classes of a row. A mouse: the dragged row fades, a line shows where it goes. A finger:
   * the dragged row lifts with a shadow.
   */
  function rowClass(id: string): string {
    if (!drag) return "relative";
    if (drag.touch) {
      return drag.draggedId === id
        ? "relative z-10 rounded-lg bg-background shadow-lg ring-2 ring-primary/40"
        : "relative";
    }
    if (drag.draggedId === id) return "relative opacity-40";
    if (drag.target?.id !== id) return "relative";
    return drag.target.position === "before" ? `relative ${LINE_BEFORE}` : `relative ${LINE_AFTER}`;
  }

  return { handleProps, rowProps, listProps, rowClass };
}
