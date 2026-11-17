import { moveById, moveTo, type Direction, type DropPosition } from "@pocket-apps/ui/drag-sort";
import type { AppInfo } from "@pocket-apps/vite-config";

/** The apps in the saved order. Apps that are not in the order come after them, in build order. */
export function orderApps(apps: readonly AppInfo[], order: readonly string[]): AppInfo[] {
  const rank = new Map(order.map((name, index) => [name, index]));
  const position = (app: AppInfo) => rank.get(app.name) ?? order.length + apps.indexOf(app);
  return [...apps].sort((a, b) => position(a) - position(b));
}

/** The apps as items with an ID, for the list functions of `@pocket-apps/ui/drag-sort`. */
function items(ordered: readonly AppInfo[]): { id: string }[] {
  return ordered.map((app) => ({ id: app.name }));
}

/**
 * Moves one app a place up (-1) or down (1) in the ordered list, for an arrow key on its grip.
 * Returns the new order (all app names). Does nothing at the start or the end of the list.
 */
export function moveApp(ordered: readonly AppInfo[], name: string, direction: Direction): string[] {
  return moveById(items(ordered), name, direction).map((item) => item.id);
}

/** Moves one app before or after another app, for a drop. Returns the new order (all app names). */
export function dropApp(
  ordered: readonly AppInfo[],
  name: string,
  targetName: string,
  position: DropPosition,
): string[] {
  return moveTo(items(ordered), name, targetName, position).map((item) => item.id);
}
