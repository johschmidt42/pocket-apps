import { expect, type Page } from "@playwright/test";
import { FOLDER_NAME, readDataFile, releaseUrl, test, withDataFolder } from "./helpers.ts";

const FILE = "lebenslauf/lebenslauf.json";

type SavedFile = {
  data: {
    person: { name: string };
    variants: {
      id: string;
      name: string;
      language: string;
      photo: string | null;
      sections: { title: string }[];
    }[];
  };
};

async function openWithFolder(page: Page) {
  await withDataFolder(page);
  await page.goto(releaseUrl("lebenslauf.html"));
  await page.getByRole("button", { name: "Ordner wählen …" }).click();
}

function frame(page: Page) {
  return page.frameLocator('iframe[title="Vorschau des Lebenslaufs"]');
}

/** The CV in the frame. The sheets of the pages show copies of it. */
function cv(page: Page) {
  return frame(page).locator(".cv-flow");
}

async function savedFile(page: Page): Promise<SavedFile> {
  await expect(page.getByRole("status")).toHaveText("Gespeichert");
  return JSON.parse((await readDataFile(page, FILE)) ?? "") as SavedFile;
}

test.describe("lebenslauf in Chrome and Edge", () => {
  test("shows the example in the design and keeps all after a reload", async ({
    page,
    pageErrors,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await openWithFolder(page);

    await page.getByLabel("Name", { exact: true }).fill("Erika Mustermann");
    await page.getByRole("button", { name: "Beispiel laden" }).click();
    await page.getByRole("radio", { name: "Englisch" }).click();

    // The design has its own CSS in the frame. Tailwind of the app does not reach it.
    const name = cv(page).getByRole("heading", { level: 1, name: "Erika Mustermann" });
    await expect(name).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(name).toHaveCSS("background-color", "rgb(31, 61, 122)");
    await expect(cv(page).getByRole("heading", { level: 2, name: "Projects" })).toHaveCSS(
      "font-family",
      /Times New Roman/,
    );
    await expect(cv(page).getByText("Since 01/2024")).toBeVisible();

    // The frame scales the A4 sheet down to the column and grows with its content.
    const frameBox = await page.locator('iframe[title="Vorschau des Lebenslaufs"]').boundingBox();
    expect(frameBox?.width).toBeLessThan(794);
    expect(frameBox?.height).toBeGreaterThan(frameBox?.width ?? 0);
    // The sheet fits into the frame exactly: no scroll bars in the frame.
    const overflow = await frame(page)
      .locator("html")
      .evaluate((root) => ({
        x: root.scrollWidth - root.clientWidth,
        y: root.scrollHeight - root.clientHeight,
      }));
    expect(overflow.x).toBeLessThanOrEqual(0);
    expect(overflow.y).toBeLessThanOrEqual(1);

    // The page of the app stays in dark mode, the sheet stays white.
    await page.getByRole("button", { name: "Dunkles Design" }).click();
    await expect(frame(page).locator(".cv-sheet")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );

    const saved = await savedFile(page);
    expect(saved.data.person.name).toBe("Erika Mustermann");
    expect(saved.data.variants[0]).toMatchObject({ language: "en" });
    expect(saved.data.variants[0]?.sections.map((section) => section.title)).toEqual([
      "Projects",
      "Work History",
      "Education",
      "Skills",
    ]);

    await page.reload();

    await expect(cv(page).getByRole("heading", { level: 2, name: "Skills" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("moves sections, entries and contact lines with drag and drop", async ({
    page,
    pageErrors,
  }) => {
    // All cards must fit on the screen: Playwright cannot scroll during a drag.
    await page.setViewportSize({ width: 1400, height: 2400 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();

    // A handle shows the grab cursor, a clickable entry the hand.
    const skillsHandle = page.getByRole("button", { name: "Abschnitt „Skills“ verschieben" });
    await expect(skillsHandle).toHaveCSS("cursor", "grab");
    await expect(page.getByRole("button", { name: /^Cloud Migration/ })).toHaveCSS(
      "cursor",
      "pointer",
    );

    // Drop "Skills" on the upper half of "Projects": it goes before it.
    const projectsCard = page.getByRole("heading", { level: 3, name: "Projects" });
    await skillsHandle.dragTo(projectsCard, { targetPosition: { x: 5, y: 2 } });
    await expect(cv(page).getByRole("heading", { level: 2 })).toHaveText([
      "Skills",
      "Projects",
      "Work History",
      "Education",
    ]);

    // Drop "Cloud Migration" on the upper half of "Order Analytics Platform".
    const firstEntry = page.getByRole("button", { name: /^Order Analytics Platform/ });
    await page
      .getByRole("button", { name: "„Cloud Migration“ verschieben" })
      .dragTo(firstEntry, { targetPosition: { x: 20, y: 2 } });
    await expect(cv(page).getByRole("heading", { level: 3 })).toHaveText([
      "Cloud Migration",
      "Order Analytics Platform",
    ]);

    // Drop "Work History" on the lower half of "Education": it goes after it.
    const educationAdd = page.getByRole("button", { name: "Eintrag hinzufügen" }).nth(3);
    await page
      .getByRole("button", { name: "Abschnitt „Work History“ verschieben" })
      .dragTo(educationAdd);
    await expect(cv(page).getByRole("heading", { level: 2 })).toHaveText([
      "Skills",
      "Projects",
      "Education",
      "Work History",
    ]);

    // Drag "Skills" over the lower half of "Projects" and drop it in the gap below:
    // it goes to the place that the line showed last, after "Projects".
    const handleBox = await skillsHandle.boundingBox();
    const educationBox = await page
      .getByRole("heading", { level: 3, name: "Education" })
      .boundingBox();
    if (!handleBox || !educationBox) throw new Error("A box is missing.");
    await page.mouse.move(handleBox.x + 5, handleBox.y + 5);
    await page.mouse.down();
    // The gap is 16 px high. The header of the "Education" card starts about 20 px below it.
    const gapY = educationBox.y - 28;
    await page.mouse.move(handleBox.x + 5, gapY - 40, { steps: 10 });
    await page.mouse.move(handleBox.x + 5, gapY, { steps: 5 });
    await page.mouse.up();
    await expect(cv(page).getByRole("heading", { level: 2 })).toHaveText([
      "Projects",
      "Skills",
      "Education",
      "Work History",
    ]);

    // A drop on a text field changes nothing in the field.
    const nameField = page.getByLabel("Name", { exact: true });
    await nameField.fill("Erika");
    await page.getByRole("button", { name: "„Cloud Migration“ verschieben" }).dragTo(nameField);
    await expect(nameField).toHaveValue("Erika");

    // An entry does not go into the list of sections.
    await page
      .getByRole("button", { name: "„Cloud Migration“ verschieben" })
      .dragTo(page.getByRole("heading", { level: 3, name: "Education" }));
    await expect(cv(page).getByRole("heading", { level: 3 })).toHaveText([
      "Cloud Migration",
      "Order Analytics Platform",
    ]);

    await page.getByRole("button", { name: "Kontaktzeile hinzufügen" }).click();
    await page.keyboard.type("erika@example.com");
    await page.getByRole("button", { name: "Kontaktzeile hinzufügen" }).click();
    await page.keyboard.type("erika.de");
    const email = page.getByRole("textbox", { name: "E-Mail" });
    await page
      .getByRole("button", { name: "Website verschieben" })
      .dragTo(email, { targetPosition: { x: 5, y: 2 } });
    await expect(cv(page).getByRole("listitem").first()).toHaveText("erika.de");

    const saved = await savedFile(page);
    expect(saved.data.variants[0]?.sections.map((section) => section.title)).toEqual([
      "Projects",
      "Skills",
      "Education",
      "Work History",
    ]);
    expect(saved.data.person.name).toBe("Erika");
    expect(pageErrors).toEqual([]);
  });

  test("highlights a section in the editor and in the preview", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();
    const sheetSection = frame(page)
      .locator(".cv-sheet [data-section-id]")
      .filter({
        has: frame(page).getByText("Work History", { exact: true }),
      });

    await page.getByRole("heading", { level: 3, name: "Work History" }).hover();
    await expect(sheetSection).toHaveCSS("outline-style", "solid");

    // The mouse on the title of the section in the sheet of the page highlights the card in the
    // editor. (In the middle of the section, the mouse would be on an entry.)
    await page.mouse.move(0, 0);
    await expect(sheetSection).toHaveCSS("outline-style", "none");
    const box = await sheetSection.getByRole("heading", { level: 2 }).boundingBox();
    if (!box) throw new Error("The section is missing.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator("div[data-highlighted]")).toContainText("Work History");
    await expect(page.locator("li[data-highlighted]")).toHaveCount(0);
    await expect(sheetSection).toHaveCSS("outline-style", "solid");
  });

  test("highlights an entry in both directions without a scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();
    // More entries: the CV gets a second page, below the visible part of the preview.
    for (const number of [1, 2, 3, 4, 5, 6]) {
      await page.getByRole("button", { name: "Eintrag hinzufügen" }).nth(3).click();
      await page.getByLabel("Label").fill(`Skill ${String(number)}`);
      await page.getByLabel("Werte").fill("One\nTwo\nThree\nFour\nFive\nSix\nSeven");
      await page.getByRole("button", { name: "Speichern" }).click();
    }
    await expect(frame(page).locator(".cv-sheet")).toHaveCount(2);
    const preview = page.getByRole("region", { name: "Vorschau" });
    await page.mouse.move(0, 0);
    await preview.evaluate((element) => {
      element.scrollTop = 0;
    });

    // The mouse on the last entry in the editor: the preview highlights it.
    await page.getByRole("button", { name: /^Skill 6/ }).hover();
    const sheetEntry = frame(page)
      .locator(".cv-sheet [data-entry-id]")
      .filter({ hasText: "Skill 6" })
      .last();
    await expect(sheetEntry).toHaveCSS("outline-style", "solid");
    // The preview does not jump to the entry. The user found that restless.
    await page.waitForTimeout(500);
    expect(await preview.evaluate((element) => element.scrollTop)).toBe(0);

    // The mouse on an entry in the preview highlights its row in the editor.
    await page.mouse.move(0, 0);
    const freelancer = frame(page)
      .locator(".cv-sheet [data-entry-id]")
      .filter({ hasText: "Freelancer" })
      .first();
    await freelancer.scrollIntoViewIfNeeded();
    const box = await freelancer.boundingBox();
    if (!box) throw new Error("The entry is missing.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator("li[data-highlighted]")).toContainText("Freelancer");
    await expect(freelancer).toHaveCSS("outline-style", "solid");
  });

  test("shows the same pages as the print", async ({ page, browser }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();
    await expect(frame(page).locator(".cv-sheet")).toHaveCount(1);

    // Ten more projects make the CV longer than one page.
    for (const number of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      await page.getByRole("button", { name: "Eintrag hinzufügen" }).first().click();
      await page.getByLabel("Titel").fill(`Project ${String(number)}`);
      await page.getByLabel("Beschreibung").fill("A long description of the project. ".repeat(4));
      await page.getByLabel("Aufgaben").fill("Task one\nTask two\nTask three");
      await page.getByRole("button", { name: "Speichern" }).click();
    }
    const sheets = frame(page).locator(".cv-sheet");
    await expect(sheets).not.toHaveCount(1);

    // The print of the same document has as many pages as the preview.
    const html = await page.evaluate(
      () => document.querySelector("iframe")?.contentDocument?.documentElement.outerHTML ?? "",
    );
    const printPage = await browser.newPage();
    await printPage.setContent(`<!doctype html>${html}`);
    const pdf = await printPage.pdf({ preferCSSPageSize: true });
    const pdfPages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pdfPages.length).toBeGreaterThan(1);
    await expect(sheets).toHaveCount(pdfPages.length);
  });

  test("uses the full width of a wide window", async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1200 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();

    const mainBox = await page.getByRole("main").boundingBox();
    const frameBox = await page.locator('iframe[title="Vorschau des Lebenslaufs"]').boundingBox();
    expect(mainBox?.width).toBeGreaterThan(2500);
    // The sheet grows above 100 % (794 px for A4) on a wide screen.
    expect(frameBox?.width).toBeGreaterThan(1000);
    await expect(cv(page).getByRole("heading", { level: 2, name: "Projects" })).toBeVisible();
  });

  test("fits a phone, also with a long entry", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();
    // A list row with many values: its line in the editor is longer than the screen.
    await page.getByRole("button", { name: "Eintrag hinzufügen" }).nth(3).click();
    await page.getByLabel("Label").fill("Lange Liste");
    await page
      .getByLabel("Werte")
      .fill(
        Array.from({ length: 12 }, (_, index) => `AZ-${String(900 + index)}: Azure`).join("\n"),
      );
    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(page.getByRole("button", { name: /^Lange Liste/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  });

  test("keeps a photo per variant as a JPEG file in the data folder", async ({
    page,
    pageErrors,
  }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();
    // A red PNG, 40 × 20 pixels: wider than 4 : 5, so the app cuts its sides.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAIAAABwJOjsAAAAJElEQVR4nGM4YWMzIIhh1OJRi0ctHrV41OJRi0ctHrV45FgMAGQL6C7l1KfNAAAAAElFTkSuQmCC",
      "base64",
    );

    await page
      .getByLabel("Foto-Datei")
      .setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png });

    const photo = cv(page).getByRole("img", { name: "Foto" });
    await expect(photo).toBeVisible();
    // The app stores a JPEG of 600 × 750 pixels.
    expect(await photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(600);
    expect(await photo.evaluate((image: HTMLImageElement) => image.naturalHeight)).toBe(750);
    const saved = await savedFile(page);
    const variant = saved.data.variants[0];
    if (!variant) throw new Error("The variant is missing.");
    expect(variant.photo).toBe(`foto-${variant.id}.jpg`);
    const fileStart = await page.evaluate(
      async ({ folderName, fileName }) => {
        const folder = await (
          await (await navigator.storage.getDirectory()).getDirectoryHandle(folderName)
        ).getDirectoryHandle("lebenslauf");
        const bytes = new Uint8Array(
          await (await (await folder.getFileHandle(fileName)).getFile()).arrayBuffer(),
        );
        return Array.from(bytes.slice(0, 3));
      },
      { folderName: FOLDER_NAME, fileName: `foto-${variant.id}.jpg` },
    );
    // A JPEG file starts with the bytes FF D8 FF.
    expect(fileStart).toEqual([0xff, 0xd8, 0xff]);

    // After a reload, the photo comes from the file again.
    await page.reload();
    await expect(cv(page).getByRole("img", { name: "Foto" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("switches to the design modern with its own look", async ({ page, pageErrors }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();

    await page.getByRole("radio", { name: "Modern" }).click();

    await expect(cv(page).locator("article")).toHaveCSS("font-family", /Helvetica Neue/);
    const firstTool = cv(page)
      .getByRole("list", { name: "Tools" })
      .first()
      .getByRole("listitem")
      .first();
    await expect(firstTool).toHaveText("Python");
    await expect(firstTool).toHaveCSS("background-color", "rgb(236, 254, 255)");
    await expect(frame(page).locator(".cv-sheet")).toHaveCount(1);
    const saved = await savedFile(page);
    expect(saved.data.variants[0]).toMatchObject({ design: "modern" });
    expect(pageErrors).toEqual([]);
  });

  test("prints only the CV", async ({ page, pageErrors }) => {
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();
    await expect(cv(page).getByRole("heading", { level: 2, name: "Projects" })).toBeAttached();
    // Chrome would open its print dialog. The test records the call instead.
    await page.evaluate(() => {
      const frame = document.querySelector<HTMLIFrameElement>("iframe");
      const view = frame?.contentWindow;
      if (!view) throw new Error("The preview frame is missing.");
      view.print = () => {
        document.body.dataset.printed = "cv";
      };
    });

    await page.getByRole("button", { name: "Drucken / PDF" }).click();

    await expect(page.locator("body")).toHaveAttribute("data-printed", "cv");
    expect(pageErrors).toEqual([]);
  });

  test("shows the preview in a narrow window without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openWithFolder(page);
    await page.getByRole("button", { name: "Beispiel laden" }).click();

    await page.getByRole("radio", { name: "Vorschau" }).click();

    await expect(cv(page).getByRole("heading", { level: 2, name: "Projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Abschnitt hinzufügen" })).toBeHidden();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
