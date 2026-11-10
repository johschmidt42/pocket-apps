/** The DOM ID of a button of one entry. It lets the list keep the keyboard focus. */
export function entryButtonId(id: string, action: "edit" | "remove"): string {
  return `entry-${id}-${action}`;
}

/** The DOM ID of the add button of a list. */
export function addButtonId(listId: string): string {
  return `${listId}-add`;
}
