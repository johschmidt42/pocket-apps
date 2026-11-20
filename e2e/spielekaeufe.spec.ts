import { expect } from "@playwright/test";
import {
  dataFileText,
  readDataFile,
  releaseUrl,
  test,
  withDataFolder,
  writeDataFile,
} from "./helpers.ts";

const FILE = "spielekaeufe/spielekaeufe.json";
/** A red PNG of 1 × 1 pixel, as the picture of Steam. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64",
);

test.describe("spielekaeufe in Chrome and Edge", () => {
  test("adds a purchase with a picture of Steam, sorts and keeps it after a reload", async ({
    page,
    pageErrors,
  }) => {
    const pictures: string[] = [];
    await page.route("https://cdn.cloudflare.steamstatic.com/**", (route) => {
      pictures.push(route.request().url());
      return route.fulfill({ contentType: "image/png", body: PNG });
    });
    await withDataFolder(page);
    await page.goto(releaseUrl("spielekaeufe.html"));
    await writeDataFile(
      page,
      FILE,
      dataFileText("spielekaeufe", 1, {
        purchases: [
          { id: "a", date: "2025-01-10", name: "INSIDE", priceCents: 399, appId: null },
          { id: "b", date: "2024-03-01", name: "Hades", priceCents: 1249, appId: null },
        ],
      }),
    );
    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await expect(page.getByText("2 Spiele ·")).toBeVisible();

    await page.getByRole("button", { name: "Kauf" }).click();
    const dialog = page.getByRole("dialog", { name: "Neuer Kauf" });
    await dialog.getByLabel("Spiel").fill("Frostpunk");
    await dialog.getByLabel("Datum").fill("2026-11-01");
    await dialog.getByLabel("Preis in Euro").fill("7,99");
    await dialog
      .getByLabel("Steam-Link oder AppID (optional)")
      .fill("https://store.steampowered.com/app/323190/Frostpunk/");
    await dialog.getByRole("button", { name: "Speichern" }).click();

    const names = page.getByRole("list", { name: "Käufe" }).getByRole("heading", { level: 3 });
    await expect(names).toHaveText(["Frostpunk", "INSIDE", "Hades"]);
    await page.getByLabel("Sortieren nach").selectOption({ label: "Preis (teuerste zuerst)" });
    await expect(names).toHaveText(["Hades", "Frostpunk", "INSIDE"]);
    expect(pictures).toContain(
      "https://cdn.cloudflare.steamstatic.com/steam/apps/323190/header.jpg",
    );

    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse((await readDataFile(page, FILE)) ?? "") as {
      data: { purchases: { name: string; priceCents: number; appId: number | null }[] };
    };
    expect(saved.data.purchases).toContainEqual(
      expect.objectContaining({ name: "Frostpunk", priceCents: 799, appId: 323190 }),
    );

    await page.reload();
    await expect(page.getByText("3 Spiele ·")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
