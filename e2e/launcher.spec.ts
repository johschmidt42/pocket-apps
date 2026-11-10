import { expect } from "@playwright/test";
import { listApps, readDataFile, releaseUrl, test, withDataFolder } from "./helpers.ts";

test.describe("launcher (release/index.html)", () => {
  test.beforeEach(async ({ page, pageErrors }) => {
    expect(pageErrors).toEqual([]);
    await page.goto(releaseUrl("index.html"));
  });

  test("shows a card for every app with version and data badge", async ({ page, pageErrors }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Pocket Apps" })).toBeVisible();
    for (const app of listApps()) {
      const card = page.getByRole("link", { name: app.title });
      await expect(card).toHaveAttribute("href", `./${app.name}.html`);
      await expect(card).toContainText(app.version);
      await expect(
        card.getByRole("img", {
          name: app.stateful ? "Speichert Daten in einer eigenen Datei" : "Speichert keine Daten",
        }),
      ).toBeVisible();
      await expect(
        card.getByRole("img", {
          name: app.network ? "Nutzt Online-Dienste" : "Nutzt keine Online-Dienste",
        }),
      ).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Alle Apps" })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test("opens an app and comes back", async ({ page }) => {
    const first = listApps()[0];
    if (!first) throw new Error("There are no apps.");

    await page.getByRole("link", { name: first.title }).click();
    await expect(page.getByRole("heading", { level: 1, name: first.title })).toBeVisible();

    await page.getByRole("link", { name: "Alle Apps" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Pocket Apps" })).toBeVisible();
  });

  test("shows a tooltip when the mouse is on an icon", async ({ page }) => {
    const first = listApps()[0];
    if (!first) throw new Error("There are no apps.");
    const label = first.stateful
      ? "Speichert Daten in einer eigenen Datei"
      : "Speichert keine Daten";

    await page.getByRole("link", { name: first.title }).getByRole("img", { name: label }).hover();

    await expect(page.getByRole("tooltip")).toHaveText(label);
  });

  test("filters the apps by the search text", async ({ page }) => {
    await page.getByLabel("Apps durchsuchen").fill("zzz-nothing");

    await expect(page.getByText("Keine App passt")).toBeVisible();
  });

  test("starts in light mode and switches to dark mode", async ({ page }) => {
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Dunkles Design" }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("keeps dark mode when the user opens an app", async ({ page }) => {
    const first = listApps()[0];
    if (!first) throw new Error("There are no apps.");

    await page.getByRole("button", { name: "Dunkles Design" }).click();
    await page.getByRole("link", { name: first.title }).click();

    await expect(page.getByRole("heading", { level: 1, name: first.title })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("fits into a narrow window without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("launcher with the data folder", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Only Chromium can open a folder.");

  test("sets up the folder for all apps and keeps the order of the apps", async ({
    page,
    pageErrors,
  }) => {
    const apps = listApps();
    const last = apps.at(-1);
    if (!last || apps.length < 2) throw new Error("This test needs two apps.");
    await withDataFolder(page);
    await page.goto(releaseUrl("index.html"));

    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: "Reihenfolge ändern" }).click();
    for (let step = 1; step < apps.length; step += 1) {
      await page.getByRole("button", { name: `${last.title} nach oben` }).click();
    }
    await page.getByRole("button", { name: "Fertig" }).click();

    const cards = page.getByRole("main").getByRole("list").getByRole("link");
    await expect(cards.first()).toHaveAccessibleName(last.title);
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse((await readDataFile(page, "launcher.json")) ?? "") as {
      data: { order: string[] };
    };
    expect(saved.data.order[0]).toBe(last.name);

    await page.reload();

    await expect(cards.first()).toHaveAccessibleName(last.title);

    // A stateful app uses the same folder. It does not ask again.
    const stateful = apps.find((app) => app.stateful);
    if (stateful) {
      await page.getByRole("link", { name: stateful.title }).click();
      await expect(page.getByText(`/ ${stateful.name}.json`)).toBeVisible();
    }
    expect(pageErrors).toEqual([]);
  });
});

test.describe("launcher in other browsers", () => {
  test.skip(({ browserName }) => browserName === "chromium", "Chromium can open a folder.");

  test("shows the apps and a notice about Chrome and Edge", async ({ page }) => {
    await page.goto(releaseUrl("index.html"));

    await expect(page.getByText(/funktionieren nur in Chrome und Edge/)).toBeVisible();
    await expect(page.getByRole("main").getByRole("link")).toHaveCount(listApps().length);
    await expect(page.getByRole("button", { name: "Reihenfolge ändern" })).toHaveCount(0);
  });
});
