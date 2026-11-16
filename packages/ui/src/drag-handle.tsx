import { Button } from "./components/button.tsx";
import { GripVertical } from "lucide-react";
import type { ComponentProps } from "react";
import { SORT_HINT_ID } from "./drag-sort.ts";

export type DragHandleProps = ComponentProps<typeof Button> & {
  /** The name of the item, for example "„Projects“". */
  name: string;
  /** A smaller, lighter grip, for the rows inside a list. */
  small?: boolean;
};

/**
 * The grip at the left of a row. Drag it to move the row. With the keyboard focus on it,
 * the arrow keys move the row. Give it the props of `useDragSort().handleProps(id)`, and render
 * `<SortHint />` once on the page.
 */
export function DragHandle({ name, small = false, ...props }: DragHandleProps) {
  return (
    <Button
      variant="ghost"
      size={small ? "icon-xs" : "icon-sm"}
      className={
        small
          ? "cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
          : "cursor-grab text-muted-foreground active:cursor-grabbing"
      }
      aria-label={`${name} verschieben`}
      aria-describedby={SORT_HINT_ID}
      {...props}
    >
      <GripVertical />
    </Button>
  );
}
