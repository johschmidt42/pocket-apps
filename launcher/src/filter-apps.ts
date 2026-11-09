import type { AppInfo } from "@pocket-apps/vite-config";

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase("de");
}

/** The apps whose title, name or description contains the query. All apps for an empty query. */
export function filterApps(apps: readonly AppInfo[], query: string): AppInfo[] {
  const needle = normalize(query);
  if (needle === "") return [...apps];
  return apps.filter((app) =>
    [app.title, app.name, app.description].some((text) => normalize(text).includes(needle)),
  );
}
