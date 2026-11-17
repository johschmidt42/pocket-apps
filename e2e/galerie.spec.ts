import { expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { releaseUrl, test } from "./helpers.ts";

/**
 * A folder with: foto.jpg (EXIF preview image, orientation 6), grafik.png (no EXIF data),
 * Strand/meer.webp (subfolder), kaputt.jpg (no image), iphone.heic (format that Chrome
 * cannot show) and notizen.txt (no image file).
 */
const FOLDER = fileURLToPath(new URL("fixtures/galerie/Urlaub", import.meta.url));

test("shows the images of a folder with thumbnails and a preview", async ({ page, pageErrors }) => {
  await page.goto(releaseUrl("galerie.html"));
  // The same field that the button "Ordner wählen …" opens.
  await page.getByLabel("Bildordner").setInputFiles(FOLDER);
  await expect(page.getByText("„Urlaub“: 5 Bilder.", { exact: false })).toBeVisible();

  const list = page.getByRole("list", { name: "Bilder" });
  const row = (name: string) => list.getByRole("listitem").filter({ hasText: name });
  await expect(list.getByRole("listitem")).toHaveCount(5);

  // The EXIF preview image of the JPEG, turned upright.
  const exifThumbnail = row("foto.jpg").locator("img");
  await expect(exifThumbnail).toHaveClass(/rotate-90/);
  await expect
    .poll(() => exifThumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(160);
  // The PNG has no EXIF data: the app decodes and scales it to 160 pixels width.
  const madeThumbnail = row("grafik.png").locator("img");
  await expect
    .poll(() => madeThumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(160);
  await expect(row("Strand/meer.webp").locator("img")).toBeVisible();
  // No thumbnail: the row shows the format.
  await expect(row("kaputt.jpg")).toContainText("JPG");
  await expect(row("iphone.heic")).toContainText("HEIC");

  // The first image is selected. The browser turns the photo upright (300 × 400).
  const preview = page.getByRole("region", { name: "Vorschau" });
  await expect(preview.getByRole("img", { name: "foto.jpg" })).toBeVisible();
  await expect(preview).toContainText("foto.jpg · 300 × 400 Pixel");

  await page.keyboard.press("ArrowDown");
  await expect(preview.getByRole("img", { name: "grafik.png" })).toBeVisible();
  await expect(row("grafik.png").getByRole("button")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(preview).toContainText("Der Browser kann das Format HEIC nicht anzeigen.");
  await page.keyboard.press("ArrowDown");
  await expect(preview).toContainText("Vielleicht ist die Datei beschädigt");
  await page.keyboard.press("End");
  await expect(preview.getByRole("img", { name: "meer.webp" })).toBeVisible();
  await expect(preview).toContainText("Bild 5 von 5");

  expect(pageErrors).toEqual([]);
});
