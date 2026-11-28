import { expect } from "@playwright/test";
import { releaseUrl, test } from "./helpers.ts";

// CI computers have no GPU. SwiftShader gives Chromium WebGL in software.
test.use({ launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

test.describe("bugfight", () => {
  // Each test draws a game with WebGL in software. Two games at the same time are too much for a CI computer.
  test.describe.configure({ mode: "serial" });

  test("starts a game, uses both weapons, pauses and goes back to the title", async ({
    page,
    pageErrors,
  }) => {
    // WebGL in software is slow. On a slow CI computer, this test needs more than 30 seconds.
    test.setTimeout(180_000);
    // This test is about the controls and the weapons. One row of ants is sufficient for it, and it
    // is much less work: the 40 ants of the full wave are about 2400 objects to draw.
    await page.goto(releaseUrl("bugfight.html?rows=1"));
    await expect(page.getByRole("heading", { level: 2, name: "Bugfight" })).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();

    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("img", { name: "Leben: 7 von 7 Punkten" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Bugfight" })).toHaveCount(0);
    await expect(page.getByText("Pollen: 0")).toBeVisible();

    // Seven starts with the "Kernspucker". The space key shoots: the drum loses stones.
    await expect(page.getByRole("img", { name: "Kerne: 24 von 24" })).toBeVisible();
    await page.keyboard.down("Space");
    await expect(page.getByRole("img", { name: "Kerne: 24 von 24" })).toHaveCount(0, {
      timeout: 30_000,
    });
    await page.keyboard.up("Space");

    // The key 2 changes to the gas spray. The display shows the tank, and spraying uses its pressure.
    await page.keyboard.press("2");
    const tank = page.getByRole("progressbar", { name: "Druck im Tank" });
    await expect(tank).toHaveAttribute("aria-valuenow", "100");
    await page.keyboard.down("Space");
    await expect(tank).not.toHaveAttribute("aria-valuenow", "100", { timeout: 30_000 });
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

  test("the bot wins a wave, and a new game starts", async ({ page, pageErrors }) => {
    test.setTimeout(180_000);
    // A wave of one row, as in the first test. The full wave of 40 ants in software took so much of
    // the CI computer that tests of other apps, which run at the same time, were too slow and failed.
    // A unit test lets the bot win the full wave (`src/sim/play.test.ts`).
    await page.goto(releaseUrl("bugfight.html?bot&level=10&rows=1"));
    await page.getByRole("button", { name: "Start" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Gewonnen" })).toBeVisible({
      timeout: 120_000,
    });
    // The end screen has the score.
    await expect(page.getByText(/^Pollen gesammelt: \d+$/)).toBeVisible();
    await page.getByRole("button", { name: "Nochmal" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Gewonnen" })).toHaveCount(0);
    await expect(page.getByRole("img", { name: /^Leben: \d von 7 Punkten$/ })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
