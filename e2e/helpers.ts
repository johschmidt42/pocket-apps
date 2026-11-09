import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test as base, type Page } from "@playwright/test";
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

/** The page globals that the fake File System Access API writes. */
type FakeFileWindow = Window & { __written?: string; __permission?: string };

/** Removes the File System Access API. Then an app works like in Firefox and Safari. */
export async function withoutDirectSave(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete window.showOpenFilePicker;
    delete window.showSaveFilePicker;
  });
}

/**
 * A fake File System Access API, like in Chrome and Edge.
 * The open and save pickers return the same file handle. `openText` is its content.
 * The page keeps the last written text in `window.__written` and the permission mode in `window.__permission`.
 */
export async function withFakeDirectSave(
  page: Page,
  fileName: string,
  openText = "",
): Promise<void> {
  await page.addInitScript(
    ({ name, initialText }) => {
      const target: FakeFileWindow = window;
      const handle = {
        name,
        getFile: () => Promise.resolve(new File([initialText], name)),
        requestPermission: ({ mode }: { mode: string }) => {
          target.__permission = mode;
          return Promise.resolve("granted");
        },
        createWritable: () =>
          Promise.resolve({
            write: (text: string) => {
              target.__written = text;
              return Promise.resolve();
            },
            close: () => Promise.resolve(),
          }),
      };
      const fileHandle = handle as unknown as FileSystemFileHandle;
      window.showSaveFilePicker = () => Promise.resolve(fileHandle);
      window.showOpenFilePicker = () => Promise.resolve([fileHandle]);
    },
    { name: fileName, initialText: openText },
  );
}

/** Reads what the fake File System Access API wrote last. */
export async function readFakeFile(
  page: Page,
): Promise<{ written: string; permission: string | undefined }> {
  return page.evaluate(() => {
    const target: FakeFileWindow = window;
    return { written: target.__written ?? "", permission: target.__permission };
  });
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
