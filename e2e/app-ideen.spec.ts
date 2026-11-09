import { expect, type Page } from "@playwright/test";
import {
  dataFileText,
  FOLDER_NAME,
  listApps,
  readDataFile,
  releaseUrl,
  test,
  withDataFolder,
  writeDataFile,
} from "./helpers.ts";

const app = listApps().find((candidate) => candidate.name === "app-ideen");
if (!app) throw new Error("App app-ideen is missing.");
const version = app.version;
const FILE = "app-ideen.json";

type Idea = { id: string; title: string; description: string };
type SavedFile = { app: string; schemaVersion: number; savedWith: string; data: { ideas: Idea[] } };

const ideasFile = (ideas: Idea[], schemaVersion = 1) =>
  dataFileText("app-ideen", schemaVersion, { ideas });

async function addIdeaInUi(page: Page, title: string, description: string) {
  await page.getByLabel("Titel").fill(title);
  await page.getByLabel("Beschreibung").fill(description);
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
}

function titles(page: Page) {
  return page.getByRole("list").getByRole("heading", { level: 3 });
}

async function savedFile(page: Page): Promise<SavedFile> {
  await expect(page.getByRole("status")).toHaveText("Gespeichert");
  return JSON.parse((await readDataFile(page, FILE)) ?? "") as SavedFile;
}

/** Opens the app. If `fileText` is set, the data folder has this file first. */
async function openWithFolder(page: Page, fileText?: string) {
  await withDataFolder(page);
  await page.goto(releaseUrl("app-ideen.html"));
  if (fileText !== undefined) await writeDataFile(page, FILE, fileText);
  await page.getByRole("button", { name: "Ordner wählen …" }).click();
}

test.describe("app-ideen in Chrome and Edge", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Only Chromium can open a folder.");

  test("adds, sorts and removes ideas and saves them in the data folder", async ({
    page,
    pageErrors,
  }) => {
    await openWithFolder(page);

    await expect(page.getByText(`${FOLDER_NAME} / ${FILE}`)).toBeVisible();
    await addIdeaInUi(page, "Pflanzen", "Gießplan");
    await addIdeaInUi(page, "Rezepte", "Wochenplan");
    await addIdeaInUi(page, "Wetter", "");
    await page.getByRole("button", { name: "Wetter nach oben" }).click();
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Pflanzen löschen" }).click();
    await expect(titles(page)).toHaveText(["Wetter", "Rezepte"]);

    const saved = await savedFile(page);
    expect(saved).toMatchObject({ app: "app-ideen", schemaVersion: 1, savedWith: version });
    expect(saved.data.ideas.map((idea) => [idea.title, idea.description])).toEqual([
      ["Wetter", ""],
      ["Rezepte", "Wochenplan"],
    ]);
    expect(pageErrors).toEqual([]);
  });

  test("remembers the folder after a reload and from the launcher", async ({ page }) => {
    await openWithFolder(page);
    await addIdeaInUi(page, "Tee", "Sorten");
    await expect(page.getByRole("status")).toHaveText("Gespeichert");

    await page.reload();

    await expect(titles(page)).toHaveText(["Tee"]);

    await page.getByRole("link", { name: "Alle Apps" }).click();
    await page.getByRole("link", { name: "App-Ideen" }).click();

    await expect(titles(page)).toHaveText(["Tee"]);
  });

  test("shows an existing file of the folder in its order", async ({ page }) => {
    await openWithFolder(
      page,
      ideasFile([
        { id: "a1", title: "Fahrtenbuch", description: "Kilometer pro Fahrt" },
        { id: "a2", title: "Vokabeln", description: "" },
      ]),
    );

    await expect(titles(page)).toHaveText(["Fahrtenbuch", "Vokabeln"]);
    await expect(page.getByText("Kilometer pro Fahrt")).toBeVisible();
  });

  test("does not overwrite a file that changed elsewhere", async ({ page }) => {
    await openWithFolder(page, ideasFile([{ id: "a1", title: "Tee", description: "" }]));
    await expect(titles(page)).toHaveText(["Tee"]);
    await writeDataFile(page, FILE, ideasFile([{ id: "b1", title: "Kakao", description: "" }]));

    await addIdeaInUi(page, "Kaffee", "");

    await expect(page.getByRole("status")).toHaveText("Nicht gespeichert: Konflikt");
    expect(await readDataFile(page, FILE)).toContain("Kakao");

    await page.getByRole("button", { name: "Meine Version speichern" }).click();

    const saved = await savedFile(page);
    expect(saved.data.ideas.map((idea) => idea.title)).toEqual(["Tee", "Kaffee"]);
  });

  test("shows a clear error for the data file of another app", async ({ page }) => {
    await openWithFolder(page, dataFileText("haushaltsbuch", 1, {}));

    await expect(page.getByRole("alert")).toContainText("gehört zur App „haushaltsbuch“");
  });

  test("refuses a data file from a newer app version and keeps it", async ({ page }) => {
    const newer = ideasFile([], 99);
    await openWithFolder(page, newer);

    await expect(page.getByRole("alert")).toContainText("neueren App-Version");
    expect(await readDataFile(page, FILE)).toBe(newer);
  });

  test("wraps a very long word in a narrow window", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openWithFolder(page);

    await addIdeaInUi(page, "https://example.com/" + "x".repeat(80), "y".repeat(120));

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("app-ideen in other browsers", () => {
  test.skip(({ browserName }) => browserName === "chromium", "Chromium can open a folder.");

  test("asks for Chrome or Edge", async ({ page, pageErrors }) => {
    await page.goto(releaseUrl("app-ideen.html"));

    await expect(
      page.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
