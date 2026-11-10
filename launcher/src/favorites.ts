import type { AppInfo } from "@pocket-apps/vite-config";

/** The DOM ID of the favorite button of an app. It lets the launcher keep the keyboard focus. */
export function favoriteButtonId(name: string): string {
  return `favorite-${name}`;
}

/** Adds the app to the favorites, or removes it if it is a favorite. Returns the new list. */
export function toggleFavorite(favorites: readonly string[], name: string): string[] {
  return favorites.includes(name)
    ? favorites.filter((favorite) => favorite !== name)
    : [...favorites, name];
}

/** Splits the apps into favorites and the other apps. Both lists keep the order of `apps`. */
export function splitFavorites(
  apps: readonly AppInfo[],
  favorites: readonly string[],
): { favorites: AppInfo[]; others: AppInfo[] } {
  const isFavorite = (app: AppInfo) => favorites.includes(app.name);
  return { favorites: apps.filter(isFavorite), others: apps.filter((app) => !isFavorite(app)) };
}
