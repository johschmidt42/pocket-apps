import { test as base, type Page } from "@playwright/test";
import { listApps, type AppInfo } from "../packages/vite-config/index.js";

export { listApps, type AppInfo };

/** The address of release/ on the local test server (see playwright.config.ts). */
const RELEASE_URL = "http://localhost:4173/pocket-apps/";

/** The name of the fake data folder. */
export const FOLDER_NAME = "Pocket Apps Daten";

/** The URL of a file in release/ on the local test server. */
export function releaseUrl(fileName: string): string {
  return new URL(fileName, RELEASE_URL).href;
}

/**
 * Test with two additions:
 * - It blocks all network requests to other servers. The apps must not need them.
 * - `pageErrors` collects page errors, console errors and blocked network requests.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: async ({ page, context }, provide) => {
    const errors: string[] = [];
    const origin = new URL(RELEASE_URL).origin;
    await context.route(
      (url) => /^(https?|wss?):$/.test(url.protocol) && url.origin !== origin,
      (route) => {
        errors.push(`network request: ${route.request().url()}`);
        return route.abort();
      },
    );
    page.on("pageerror", (error) => errors.push(`page error: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console error: ${message.text()}`);
    });
    await provide(errors);
  },
});

/**
 * Replaces the folder dialog of Chrome. It returns the folder `FOLDER_NAME` in the
 * origin private file system (OPFS) of the browser. Each test has its own empty OPFS.
 * Call it before `page.goto()`.
 */
export async function withDataFolder(page: Page): Promise<void> {
  await page.addInitScript((name) => {
    window.showDirectoryPicker = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle(name, { create: true });
  }, FOLDER_NAME);
}

/** Writes a file into the fake data folder, like a change on another computer. */
export async function writeDataFile(page: Page, fileName: string, text: string): Promise<void> {
  await page.evaluate(
    async ({ name, file, content }) => {
      const folder = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(name, { create: true });
      const writable = await (await folder.getFileHandle(file, { create: true })).createWritable();
      await writable.write(content);
      await writable.close();
    },
    { name: FOLDER_NAME, file: fileName, content: text },
  );
}

/** Reads a file of the fake data folder. Returns `null` if it does not exist. */
export async function readDataFile(page: Page, fileName: string): Promise<string | null> {
  return page.evaluate(
    async ({ name, file }) => {
      try {
        const folder = await (await navigator.storage.getDirectory()).getDirectoryHandle(name);
        return await (await (await folder.getFileHandle(file)).getFile()).text();
      } catch {
        return null;
      }
    },
    { name: FOLDER_NAME, file: fileName },
  );
}

/** Builds the text of a data file (envelope with data). */
export function dataFileText(app: string, schemaVersion: number, data: unknown): string {
  return JSON.stringify({
    app,
    schemaVersion,
    savedWith: "1.0",
    savedAt: "2026-11-09T12:00:00.000Z",
    data,
  });
}
