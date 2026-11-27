import { expect } from "@playwright/test";
import { listApps, releaseUrl, test } from "./helpers.ts";

// Each app is an installable Progressive Web App (PWA): a web app manifest, icons and the one
// service worker of the site. See "Apps as installable PWAs" in docs/decisions.md.

/** The width and height of a PNG file, from its IHDR header. */
function pngSize(body: Buffer) {
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

for (const app of listApps()) {
  test(`${app.name} has a manifest that Chrome reads`, async ({ page, request }) => {
    await page.goto(releaseUrl(`${app.name}.html`));
    const cdp = await page.context().newCDPSession(page);

    const { url, errors, data } = await cdp.send("Page.getAppManifest");

    expect(url).toBe(releaseUrl(`${app.name}.webmanifest`));
    expect(errors).toEqual([]);
    const manifest: unknown = JSON.parse(String(data));
    expect(manifest).toMatchObject({
      name: app.title,
      start_url: `./${app.name}.html`,
      scope: `./${app.name}.html`,
      display: "standalone",
    });
    for (const [file, size] of [
      [`icons/${app.name}-192.png`, 192],
      [`icons/${app.name}-512.png`, 512],
      [`icons/${app.name}-maskable-512.png`, 512],
      [`icons/${app.name}-180.png`, 180],
    ] as const) {
      const response = await request.get(releaseUrl(file));
      expect(response.headers()["content-type"]).toBe("image/png");
      expect(pngSize(await response.body())).toEqual({ width: size, height: size });
    }
  });
}

test("the launcher has an icon but no manifest", async ({ page }) => {
  await page.goto(releaseUrl("index.html"));

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "./icons/launcher-192.png",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
});

test("shows the install button when Chrome can install the app", async ({ page }) => {
  await page.goto(releaseUrl("zinsrechner.html"));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Acts like Chrome: the event comes when the page is installable.
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: () => {
        document.title = "install dialog";
        return Promise.resolve();
      },
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Als App installieren" }).click();

  await expect(page).toHaveTitle("install dialog");
  await expect(page.getByRole("button", { name: "Als App installieren" })).toHaveCount(0);
});

test("gives the status bar the color of the theme", async ({ page }) => {
  await page.goto(releaseUrl("zinsrechner.html"));
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(themeColor).toHaveAttribute("content", "#ffffff");

  await page.getByRole("button", { name: "Dunkles Design" }).click();

  await expect(themeColor).toHaveAttribute("content", "#0c0a09");
});

test("starts an app without a connection after a visit", async ({ page, context }) => {
  await page.goto(releaseUrl("zinsrechner.html"));
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  // The first page loaded before the service worker. The second visit goes through it.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Zinsrechner" })).toBeVisible();

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { level: 1, name: "Zinsrechner" })).toBeVisible();
});
