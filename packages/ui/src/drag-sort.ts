import { useState, type DragEvent, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";

// Drag and drop to change the order of a list, with a grip handle (`drag-handle.tsx`).
// Own code, not vendor code. Used by lebenslauf and app-ideen.

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

/** The DOM ID of the drag handle of an item. */
export function dragHandleId(id: string): string {
  return `drag-${id}`;
}

type DragState = {
  draggedId: string;
  target: { id: string; position: DropPosition } | null;
};

export type DragSortActions = {
  /** The user dropped `draggedId` before or after `targetId`. */
  onDrop: (draggedId: string, targetId: string, position: DropPosition) => void;
  /** The user pressed an arrow key on the handle of `id`. */
  onStep: (id: string, direction: Direction) => void;
};

/**
 * Drag and drop for one list, with the drag API of the browser. Give each row `rowProps(id)`
 * and `rowClass(id)`, its handle `handleProps(id)`, and the element around the rows
 * `listProps()`. Each list has its own state. Thus a row
 * of another list cannot be dropped here. The arrow keys on a handle move its row one step.
 */
export function useDragSort({ onDrop, onStep }: DragSortActions) {
  const [drag, setDrag] = useState<DragState | null>(null);

  function handleProps(id: string) {
    return {
      id: dragHandleId(id),
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(DRAG_TYPE, id);
        const row = event.currentTarget.closest(`[${ROW_ATTRIBUTE}]`);
        if (row) {
          const box = row.getBoundingClientRect();
          event.dataTransfer.setDragImage(row, event.clientX - box.left, event.clientY - box.top);
        }
        // Chrome takes the drag image after this handler. The row fades only after that.
        window.setTimeout(() => {
          setDrag({ draggedId: id, target: null });
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

  /** The classes of a row: faded while it is dragged, a line where the dragged row goes. */
  function rowClass(id: string): string {
    if (!drag) return "relative";
    if (drag.draggedId === id) return "relative opacity-40";
    if (drag.target?.id !== id) return "relative";
    return drag.target.position === "before" ? `relative ${LINE_BEFORE}` : `relative ${LINE_AFTER}`;
  }

  return { handleProps, rowProps, listProps, rowClass };
}
