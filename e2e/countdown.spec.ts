import { expect } from "@playwright/test";
import { readDataFile, releaseUrl, test, withDataFolder } from "./helpers.ts";

test.describe("countdown in Chrome and Edge", () => {
  test("adds an event, counts down and keeps it after a reload", async ({ page, pageErrors }) => {
    const nextYear = new Date().getFullYear() + 1;
    await withDataFolder(page);
    await page.goto(releaseUrl("countdown.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    await page.getByRole("button", { name: "Neuer Termin" }).click();
    await page.getByLabel("Name").fill("Hochzeit");
    await page.getByLabel("Datum").fill(`${String(nextYear)}-06-12`);
    await page.getByLabel("Uhrzeit (optional)").fill("14:30");
    await page.getByRole("button", { name: "Speichern" }).click();

    // A new file starts with the end of the year. The new event comes after it.
    await expect(page.getByRole("heading", { level: 3, name: /^Jahresende/ })).toBeVisible();
    const timer = page.getByRole("timer").nth(1);
    await expect(timer).toHaveAccessibleName(/^Noch \d+ Tage/);
    const first = await timer.getAttribute("aria-label");
    await expect(timer).not.toHaveAttribute("aria-label", first ?? "");
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse((await readDataFile(page, "countdown.json")) ?? "") as {
      data: { events: { name: string; date: string; time: string | null }[] };
    };
    expect(saved.data.events.at(-1)).toMatchObject({
      name: "Hochzeit",
      date: `${String(nextYear)}-06-12`,
      time: "14:30",
    });

    await page.reload();

    await expect(page.getByRole("heading", { level: 3, name: "Hochzeit" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
