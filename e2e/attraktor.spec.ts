import { expect } from "@playwright/test";
import { releaseUrl, test } from "./helpers.ts";

// CI computers have no GPU. SwiftShader gives Chromium WebGL in software.
test.use({ launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

test.describe("attraktor", () => {
  test("opens an attractor, pulls with the mouse and changes effect and colors", async ({
    page,
    pageErrors,
  }) => {
    await page.goto(releaseUrl("attraktor.html"));
    await expect(
      page.getByRole("heading", { level: 2, name: "Ausgangszustand wählen" }),
    ).toBeVisible();

    // A click on the preview picture of a card opens the attractor, not only a click on the name.
    const preview = await page
      .getByRole("listitem")
      .filter({ hasText: "Thomas" })
      .locator("svg")
      .boundingBox();
    if (preview === null) throw new Error("The preview has no size.");
    await page.mouse.click(preview.x + preview.width / 2, preview.y + preview.height / 2);

    const picture = page.getByRole("img", { name: "Animation des Attraktors Thomas" });
    await expect(picture.locator("canvas")).toBeVisible();
    const status = page.getByText(/^b 0,208 · Kraft/);
    await expect(status).toHaveText("b 0,208 · Kraft 0,00");

    // The lines move: two pictures of the canvas are different.
    const first = await picture.screenshot();
    await expect.poll(async () => (await picture.screenshot()).equals(first)).toBe(false);

    const box = await picture.boundingBox();
    if (box === null) throw new Error("The picture has no size.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(status).toHaveText(/Kraft 2,[0-9]{2}$/);
    await page.mouse.up();

    // Full screen: the picture fills the window, a button leads back.
    await page.getByRole("button", { name: "Vollbild", exact: true }).click();
    await expect(page.getByRole("button", { name: "Vollbild beenden" })).toBeVisible();
    const viewport = page.viewportSize();
    await expect.poll(async () => (await picture.boundingBox())?.height).toBe(viewport?.height);
    await page.getByRole("button", { name: "Vollbild beenden" }).click();
    await expect(page.getByRole("button", { name: "Vollbild beenden" })).toHaveCount(0);

    await page.getByRole("radio", { name: "Schwerkraft" }).click();
    await expect(page.getByText(/Die Maus zieht an den Punkten/)).toBeVisible();
    await page.getByRole("radio", { name: "Regenbogen" }).click();
    await expect(page.getByText("Farben: Regenbogen")).toBeVisible();
    await page.getByRole("button", { name: "Zurücksetzen" }).click();

    await page.getByRole("button", { name: "Galerie" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Ausgangszustand wählen" }),
    ).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});
