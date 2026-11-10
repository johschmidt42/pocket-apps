import type { AppInfo } from "@pocket-apps/vite-config";

export type Direction = "up" | "down";

/** The apps in the saved order. Apps that are not in the order come after them, in build order. */
export function orderApps(apps: readonly AppInfo[], order: readonly string[]): AppInfo[] {
  const rank = new Map(order.map((name, index) => [name, index]));
  const position = (app: AppInfo) => rank.get(app.name) ?? order.length + apps.indexOf(app);
  return [...apps].sort((a, b) => position(a) - position(b));
}

/**
 * Moves one app a place up or down in the ordered list. Returns the new order (all app names).
 * Does nothing at the start or the end of the list.
 */
export function moveApp(ordered: readonly AppInfo[], name: string, direction: Direction): string[] {
  const names = ordered.map((app) => app.name);
  const from = names.indexOf(name);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= names.length) return names;
  names.splice(from, 1);
  names.splice(to, 0, name);
  return names;
}
