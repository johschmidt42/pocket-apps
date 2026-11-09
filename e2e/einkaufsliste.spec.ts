import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { listApps, releaseUrl, test } from "./helpers.ts";

const app = listApps().find((candidate) => candidate.name === "einkaufsliste");
if (!app) throw new Error("App einkaufsliste is missing.");
const version = app.version;

type SavedFile = {
  app: string;
  schemaVersion: number;
  savedWith: string;
  data: { items: { name: string; done: boolean }[] };
};

/** Removes the File System Access API. Then the app works like in Firefox and Safari. */
async function withoutDirectSave(page: Page) {
  await page.addInitScript(() => {
    delete window.showOpenFilePicker;
    delete window.showSaveFilePicker;
  });
}

/**
 * A fake File System Access API. It keeps the last written text in `window.__written`.
 * `openText` is the content of the file that the open picker returns.
 */
async function withFakeDirectSave(page: Page, openText = "") {
  await page.addInitScript((initialText) => {
    const target = window as Window & { __written?: string; __permission?: string };
    const handle = {
      name: "liste.json",
      getFile: () => Promise.resolve(new File([initialText], "liste.json")),
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
  }, openText);
}

function dataFile(schemaVersion: number, items: { id: string; name: string; done: boolean }[]) {
  return JSON.stringify({
    app: "einkaufsliste",
    schemaVersion,
    savedWith: "1.0",
    savedAt: "2026-11-09T12:00:00.000Z",
    data: { items },
  });
}

async function addItems(page: Page, names: string[]) {
  for (const name of names) {
    await page.getByLabel("Neuer Eintrag").fill(name);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("checkbox", { name })).toBeVisible();
  }
}

test.describe("einkaufsliste", () => {
  test("without direct save: creates a list and saves it as a download", async ({
    page,
    pageErrors,
  }) => {
    await withoutDirectSave(page);
    await page.goto(releaseUrl("einkaufsliste.html"));

    await page.getByRole("button", { name: "Neue Datei" }).click();
    await addItems(page, ["Milch", "Brot"]);
    await page.getByRole("checkbox", { name: "Brot" }).click();
    await expect(page.getByRole("status")).toHaveText("Nicht gespeichert");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Speichern" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("einkaufsliste.json");
    const saved = JSON.parse(readFileSync(await download.path(), "utf8")) as SavedFile;
    expect(saved).toMatchObject({ app: "einkaufsliste", schemaVersion: 1, savedWith: version });
    expect(saved.data.items.map((item) => [item.name, item.done])).toEqual([
      ["Milch", false],
      ["Brot", true],
    ]);
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    expect(pageErrors).toEqual([]);
  });

  test("without direct save: opens an existing file", async ({ page }) => {
    await withoutDirectSave(page);
    await page.goto(releaseUrl("einkaufsliste.html"));
    const file = {
      app: "einkaufsliste",
      schemaVersion: 1,
      savedWith: "1.0",
      savedAt: "2026-11-09T12:00:00.000Z",
      data: { items: [{ id: "a1", name: "Käse", done: false }] },
    };

    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Datei öffnen" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "meine-liste.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(file)),
    });

    await expect(page.getByRole("checkbox", { name: "Käse" })).toBeVisible();
    await expect(page.getByText("meine-liste.json")).toBeVisible();
  });

  test("shows a clear error for the data file of another app", async ({ page }) => {
    await withoutDirectSave(page);
    await page.goto(releaseUrl("einkaufsliste.html"));
    const file = {
      app: "haushaltsbuch",
      schemaVersion: 1,
      savedWith: "1.0",
      savedAt: "2026-11-09T12:00:00.000Z",
      data: {},
    };

    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Datei öffnen" }).click();
    await (
      await chooserPromise
    ).setFiles({
      name: "fremd.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(file)),
    });

    await expect(page.getByRole("alert")).toContainText("gehört zur App „haushaltsbuch“");
  });

  test("with direct save: saves every change automatically", async ({ page, pageErrors }) => {
    await withFakeDirectSave(page);
    await page.goto(releaseUrl("einkaufsliste.html"));

    await page.getByRole("button", { name: "Neue Datei" }).click();
    await expect(page.getByText("liste.json")).toBeVisible();
    await addItems(page, ["Eier"]);

    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const written = await page.evaluate(
      () => (window as Window & { __written?: string }).__written ?? "",
    );
    const saved = JSON.parse(written) as SavedFile;
    expect(saved.data.items.map((item) => item.name)).toEqual(["Eier"]);
    expect(pageErrors).toEqual([]);
  });

  test("with direct save: opens a file, asks for write access and saves changes", async ({
    page,
    pageErrors,
  }) => {
    await withFakeDirectSave(page, dataFile(1, [{ id: "a1", name: "Tee", done: false }]));
    await page.goto(releaseUrl("einkaufsliste.html"));

    await page.getByRole("button", { name: "Datei öffnen" }).click();
    await expect(page.getByRole("checkbox", { name: "Tee" })).toBeVisible();
    await page.getByRole("checkbox", { name: "Tee" }).click();

    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const result = await page.evaluate(() => {
      const target = window as Window & { __written?: string; __permission?: string };
      return { written: target.__written ?? "", permission: target.__permission };
    });
    expect(result.permission).toBe("readwrite");
    const saved = JSON.parse(result.written) as SavedFile;
    expect(saved.data.items).toEqual([{ id: "a1", name: "Tee", done: true }]);
    expect(pageErrors).toEqual([]);
  });

  test("refuses a data file from a newer app version", async ({ page }) => {
    await withFakeDirectSave(page, dataFile(99, []));
    await page.goto(releaseUrl("einkaufsliste.html"));

    await page.getByRole("button", { name: "Datei öffnen" }).click();

    await expect(page.getByRole("alert")).toContainText("neueren App-Version");
    await expect(page.getByRole("button", { name: "Neue Datei" })).toBeVisible();
  });
});
