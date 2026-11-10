import { expect, type Page } from "@playwright/test";
import { listApps, readDataFile, releaseUrl, test, withDataFolder } from "./helpers.ts";

const app = listApps().find((candidate) => candidate.name === "fixkosten");
if (!app) throw new Error("App fixkosten is missing.");
const FILE = "fixkosten.json";

type SavedFile = {
  app: string;
  schemaVersion: number;
  savedWith: string;
  data: {
    profiles: { name: string; costs: { name: string; amountCents: number; category: string }[] }[];
  };
};

async function savedFile(page: Page): Promise<SavedFile> {
  await expect(page.getByRole("status")).toHaveText("Gespeichert");
  return JSON.parse((await readDataFile(page, FILE)) ?? "") as SavedFile;
}

test.describe("fixkosten in Chrome and Edge", () => {
  test("loads the example, adds a cost, shows the charts and keeps the data", async ({
    page,
    pageErrors,
  }) => {
    await withDataFolder(page);
    await page.goto(releaseUrl("fixkosten.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    await page.getByRole("button", { name: "Beispiel laden" }).click();
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByText("Gemeinschaftskonto")).toBeVisible();

    await page.getByRole("button", { name: "Posten", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Posten hinzufügen" });
    await dialog.getByLabel("Name").fill("Hundeversicherung");
    await dialog.getByLabel("Betrag in Euro").fill("120");
    await dialog.getByLabel("Wie oft?").selectOption("yearly");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(
      page.getByRole("list", { name: "Fixkosten" }).getByText("Hundeversicherung"),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Kategorien" }).click();
    await expect(panel.getByText("Wohnen")).toBeVisible();
    await page.getByRole("tab", { name: "Kacheln" }).click();
    await expect(panel.getByText("Miete", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Monate" }).click();
    await expect(panel.getByText("Jeden Monat:")).toBeVisible();

    const saved = await savedFile(page);
    expect(saved).toMatchObject({ app: "fixkosten", schemaVersion: 1, savedWith: app.version });
    expect(saved.data.profiles[0]?.costs.at(-1)).toMatchObject({
      name: "Hundeversicherung",
      amountCents: 12000,
      category: "insurance",
    });

    await page.reload();

    await expect(page.getByRole("list", { name: "Fixkosten" }).getByRole("listitem")).toHaveCount(
      13,
    );
    expect(pageErrors).toEqual([]);
  });

  test("keeps the profiles apart", async ({ page }) => {
    await withDataFolder(page);
    await page.goto(releaseUrl("fixkosten.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: "Beispiel laden" }).click();

    await page.getByRole("button", { name: "Neues Profil" }).click();
    await page.getByLabel("Name des Profils").fill("Eltern");
    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(page.getByRole("heading", { name: "Noch keine Einträge" })).toBeVisible();
    await page.getByLabel("Profil", { exact: true }).selectOption({ label: "Mein Haushalt" });
    await expect(page.getByRole("list", { name: "Fixkosten" }).getByRole("listitem")).toHaveCount(
      12,
    );

    const saved = await savedFile(page);
    expect(saved.data.profiles.map((profile) => profile.name)).toEqual(["Mein Haushalt", "Eltern"]);
  });
});
