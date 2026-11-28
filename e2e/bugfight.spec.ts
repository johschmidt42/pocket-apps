import { expect } from "@playwright/test";
import { releaseUrl, test } from "./helpers.ts";

// CI computers have no GPU. SwiftShader gives Chromium WebGL in software.
test.use({ launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

test.describe("bugfight", () => {
  test("starts a game, uses both weapons, pauses and goes back to the title", async ({
    page,
    pageErrors,
  }) => {
    // WebGL in software is slow. On a slow CI computer, this test needs more than 30 seconds.
    test.setTimeout(90_000);
    await page.goto(releaseUrl("bugfight.html"));
    await expect(page.getByRole("heading", { level: 2, name: "Bugfight" })).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();

    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("img", { name: "Leben: 7 von 7 Punkten" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Bugfight" })).toHaveCount(0);

    // The space key sprays gas: the pressure of the tank falls.
    const tank = page.getByRole("progressbar", { name: "Druck im Tank" });
    await expect(tank).toHaveAttribute("aria-valuenow", "100");
    await page.keyboard.down("Space");
    await expect(tank).not.toHaveAttribute("aria-valuenow", "100", { timeout: 30_000 });
    await page.keyboard.up("Space");

    // The key 2 changes to the second weapon. The display shows its stones.
    await page.keyboard.press("2");
    await expect(page.getByRole("img", { name: "Kerne: 24 von 24" })).toBeVisible();
    await page.keyboard.down("Space");
    await expect(page.getByRole("img", { name: "Kerne: 24 von 24" })).toHaveCount(0, {
      timeout: 30_000,
    });
    await page.keyboard.up("Space");

    // Esc pauses the game: with a locked pointer, the browser ends the lock, else the game gets the key.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { level: 2, name: "Pause" })).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Pause" })).toHaveCount(0);

    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Hauptmenü" }).click();
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("the bot wins the wave, and a new game starts", async ({ page, pageErrors }) => {
    // A full fight with WebGL in software.
    test.setTimeout(180_000);
    await page.goto(releaseUrl("bugfight.html?bot&level=10&debug"));
    await expect(page.getByRole("complementary", { name: "Debug" })).toBeVisible();
    await page.getByRole("button", { name: "4×" }).click();
    await page.getByRole("button", { name: "Start" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Gewonnen" })).toBeVisible({
      timeout: 150_000,
    });
    await page.getByRole("button", { name: "Nochmal" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Gewonnen" })).toHaveCount(0);
    await expect(page.getByRole("img", { name: /^Leben: \d von 7 Punkten$/ })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
