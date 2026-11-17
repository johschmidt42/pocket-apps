import { expect } from "@playwright/test";
import { readDataFile, releaseUrl, test, withDataFolder } from "./helpers.ts";

test.describe("trainingsbuch in Chrome and Edge", () => {
  test("logs a result for Fran and keeps it after a reload", async ({ page, pageErrors }) => {
    await withDataFolder(page);
    await page.goto(releaseUrl("trainingsbuch.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    await page.getByLabel("Suchen").fill("fran");
    await page.getByRole("button", { name: /^Fran/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Fran" })).toBeVisible();

    await page.getByRole("button", { name: "Ergebnis eintragen" }).click();
    const dialog = page.getByRole("dialog", { name: "Ergebnis eintragen" });
    await dialog.getByLabel("Datum").fill("2026-11-17");
    await dialog.getByLabel("Minuten").fill("4");
    await dialog.getByLabel("Sekunden").fill("5");
    await dialog.getByLabel("Notizen (optional)").fill("Unbroken");
    await dialog.getByRole("button", { name: "Speichern" }).click();

    await expect(
      page.getByRole("region", { name: "Deine Ergebnisse" }).getByText("4:05"),
    ).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse(
      (await readDataFile(page, "trainingsbuch/trainingsbuch.json")) ?? "",
    ) as { data: { results: { workoutId: string; date: string; score: unknown }[] } };
    expect(saved.data.results).toMatchObject([
      { workoutId: "fran", date: "2026-11-17", score: { kind: "time", seconds: 245 } },
    ]);

    await page.reload();
    await page.getByRole("tab", { name: "Verlauf" }).click();

    await expect(page.getByRole("button", { name: /^Fran.*4:05/ })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
