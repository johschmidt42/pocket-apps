import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test as base } from "@playwright/test";
import { listApps, ROOT_DIR, type AppInfo } from "../packages/vite-config/index.js";

export { listApps, type AppInfo };

const RELEASE = join(ROOT_DIR, "release");

/** The file:// URL of a file in release/. */
export function releaseUrl(fileName: string): string {
  return pathToFileURL(join(RELEASE, fileName)).href;
}

/**
 * Test with two additions:
 * - It blocks all network requests. The apps must work offline.
 * - `pageErrors` collects page errors, console errors and network requests.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: async ({ page, context }, provide) => {
    const errors: string[] = [];
    await context.route(/^(https?|wss?):/, (route) => {
      errors.push(`network request: ${route.request().url()}`);
      return route.abort();
    });
    page.on("pageerror", (error) => errors.push(`page error: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console error: ${message.text()}`);
    });
    await provide(errors);
  },
});
