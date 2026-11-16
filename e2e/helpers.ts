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

/**
 * Removes the folder dialog. Then the page works like Firefox or Safari, which have no folder access.
 * Call it before `page.goto()`.
 */
export async function withoutFolderAccess(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete window.showDirectoryPicker;
  });
}

/**
 * Writes a file into the fake data folder, like a change on another computer. `path` can
 * contain folders, for example "app-ideen/app-ideen.json".
 * The file times have a resolution of 1 ms. Thus the function writes again until the time is newer.
 */
export async function writeDataFile(page: Page, path: string, text: string): Promise<void> {
  await page.evaluate(
    async ({ name, filePath, content }) => {
      let folder = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(name, { create: true });
      const parts = filePath.split("/");
      const file = parts.pop() ?? "";
      for (const part of parts) folder = await folder.getDirectoryHandle(part, { create: true });
      const handle = await folder.getFileHandle(file, { create: true });
      const before = (await handle.getFile()).lastModified;
      do {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } while ((await handle.getFile()).lastModified <= before);
    },
    { name: FOLDER_NAME, filePath: path, content: text },
  );
}

/** Reads a file of the fake data folder (`path` as for `writeDataFile`). `null` if it does not exist. */
export async function readDataFile(page: Page, path: string): Promise<string | null> {
  return page.evaluate(
    async ({ name, filePath }) => {
      try {
        let folder = await (await navigator.storage.getDirectory()).getDirectoryHandle(name);
        const parts = filePath.split("/");
        const file = parts.pop() ?? "";
        for (const part of parts) folder = await folder.getDirectoryHandle(part);
        return await (await (await folder.getFileHandle(file)).getFile()).text();
      } catch {
        return null;
      }
    },
    { name: FOLDER_NAME, filePath: path },
  );
}

/** The path of the data file of an app in the data folder: `<app>/<app>.json`. */
export function dataFilePath(app: string): string {
  return `${app}/${app}.json`;
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
