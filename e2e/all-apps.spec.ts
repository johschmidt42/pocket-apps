import { expect } from "@playwright/test";
import { listApps, releaseUrl, test } from "./helpers.ts";

// These tests run for every app in apps/.
for (const app of listApps()) {
  test.describe(app.name, () => {
    test.beforeEach(async ({ page, pageErrors }) => {
      // Use the fixture, so that it blocks the network before the page loads.
      expect(pageErrors).toEqual([]);
      await page.goto(releaseUrl(`${app.name}.html`));
    });

    test("opens without network and without errors", async ({ page, pageErrors }) => {
      await expect(page.getByRole("heading", { level: 1, name: app.title })).toBeVisible();
      // Apps with "network": true may try requests. They must still start offline without errors.
      // The browser itself logs blocked requests ("Failed to load resource"). That is not an app error.
      const errors = app.network
        ? pageErrors.filter(
            (error) =>
              !error.startsWith("network request:") && !error.includes("Failed to load resource"),
          )
        : pageErrors;
      expect(errors).toEqual([]);
    });

    test("has title and version as metadata and shows the version", async ({ page }) => {
      await expect(page).toHaveTitle(app.title);
      await expect(page.locator('meta[name="pocket-app-name"]')).toHaveAttribute(
        "content",
        app.name,
      );
      await expect(page.locator('meta[name="pocket-app-version"]')).toHaveAttribute(
        "content",
        app.version,
      );
      await expect(page.getByRole("banner").first()).toContainText(app.version);
    });

    test("has the Tailwind styles", async ({ page }) => {
      // If Tailwind misses the app folder, the heading has no font weight class.
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toHaveCSS("font-weight", "600");
    });

    test("starts in light mode and switches to dark mode and back", async ({ page }) => {
      const html = page.locator("html");
      await expect(html).not.toHaveClass(/dark/);
      const lightBackground = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );

      await page.getByRole("button", { name: "Dunkles Design" }).click();

      await expect(html).toHaveClass(/dark/);
      const darkBackground = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );
      expect(darkBackground).not.toBe(lightBackground);

      await page.getByRole("button", { name: "Helles Design" }).click();

      await expect(html).not.toHaveClass(/dark/);
    });

    test("links back to the launcher", async ({ page }) => {
      if (!app.backLink) {
        await expect(page.getByRole("link", { name: "Alle Apps" })).toHaveCount(0);
        return;
      }

      await page.getByRole("link", { name: app.backLink.label }).click();

      await expect(page.getByRole("heading", { level: 1, name: "Pocket Apps" })).toBeVisible();
    });

    test("fits into a narrow window without horizontal scrolling", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
