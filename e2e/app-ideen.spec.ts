import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import {
  dataFileText,
  listApps,
  readFakeFile,
  releaseUrl,
  test,
  withFakeDirectSave,
  withoutDirectSave,
} from "./helpers.ts";

const app = listApps().find((candidate) => candidate.name === "app-ideen");
if (!app) throw new Error("App app-ideen is missing.");
const version = app.version;

type Idea = { id: string; title: string; description: string };
type SavedFile = { app: string; schemaVersion: number; savedWith: string; data: { ideas: Idea[] } };

const ideasFile = (ideas: Idea[], schemaVersion = 1) =>
  dataFileText("app-ideen", schemaVersion, { ideas });

async function addIdea(page: Page, title: string, description: string) {
  await page.getByLabel("Titel").fill(title);
  await page.getByLabel("Beschreibung").fill(description);
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
}

function titles(page: Page) {
  return page.getByRole("list").getByRole("heading", { level: 3 });
}

async function openWithChooser(page: Page, name: string, text: string) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Datei öffnen" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name, mimeType: "application/json", buffer: Buffer.from(text) });
}

test.describe("app-ideen", () => {
  test("without direct save: adds, sorts and removes ideas, then saves a download", async ({
    page,
    pageErrors,
  }) => {
    await withoutDirectSave(page);
    await page.goto(releaseUrl("app-ideen.html"));

    await page.getByRole("button", { name: "Neue Datei" }).click();
    await addIdea(page, "Pflanzen", "Gießplan");
    await addIdea(page, "Rezepte", "Wochenplan");
    await addIdea(page, "Wetter", "");
    await page.getByRole("button", { name: "Wetter nach oben" }).click();
    await page.getByRole("button", { name: "Pflanzen löschen" }).click();
    await expect(titles(page)).toHaveText(["Wetter", "Rezepte"]);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Speichern" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("app-ideen.json");
    const saved = JSON.parse(readFileSync(await download.path(), "utf8")) as SavedFile;
    expect(saved).toMatchObject({ app: "app-ideen", schemaVersion: 1, savedWith: version });
    expect(saved.data.ideas.map((idea) => [idea.title, idea.description])).toEqual([
      ["Wetter", ""],
      ["Rezepte", "Wochenplan"],
    ]);
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    expect(pageErrors).toEqual([]);
  });

  test("without direct save: opens an existing file in its order", async ({ page }) => {
    await withoutDirectSave(page);
    await page.goto(releaseUrl("app-ideen.html"));

    await openWithChooser(
      page,
      "meine-ideen.json",
      ideasFile([
        { id: "a1", title: "Fahrtenbuch", description: "Kilometer pro Fahrt" },
        { id: "a2", title: "Vokabeln", description: "" },
      ]),
    );

    await expect(titles(page)).toHaveText(["Fahrtenbuch", "Vokabeln"]);
    await expect(page.getByText("Kilometer pro Fahrt")).toBeVisible();
    await expect(page.getByText("meine-ideen.json")).toBeVisible();
  });

  test("shows a clear error for the data file of another app", async ({ page }) => {
    await withoutDirectSave(page);
    await page.goto(releaseUrl("app-ideen.html"));

    await openWithChooser(page, "fremd.json", dataFileText("haushaltsbuch", 1, {}));

    await expect(page.getByRole("alert")).toContainText("gehört zur App „haushaltsbuch“");
  });

  test("with direct save: opens a file, asks for write access and saves changes", async ({
    page,
    pageErrors,
  }) => {
    await withFakeDirectSave(
      page,
      "ideen.json",
      ideasFile([{ id: "a1", title: "Tee", description: "Sorten" }]),
    );
    await page.goto(releaseUrl("app-ideen.html"));

    await page.getByRole("button", { name: "Datei öffnen" }).click();
    await expect(titles(page)).toHaveText(["Tee"]);
    await addIdea(page, "Kaffee", "Bohnen");

    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const result = await readFakeFile(page);
    expect(result.permission).toBe("readwrite");
    const saved = JSON.parse(result.written) as SavedFile;
    expect(saved.data.ideas.map((idea) => idea.title)).toEqual(["Tee", "Kaffee"]);
    expect(pageErrors).toEqual([]);
  });

  test("refuses a data file from a newer app version", async ({ page }) => {
    await withFakeDirectSave(page, "ideen.json", ideasFile([], 99));
    await page.goto(releaseUrl("app-ideen.html"));

    await page.getByRole("button", { name: "Datei öffnen" }).click();

    await expect(page.getByRole("alert")).toContainText("neueren App-Version");
    await expect(page.getByRole("button", { name: "Neue Datei" })).toBeVisible();
  });
});
