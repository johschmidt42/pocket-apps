import { expect, type Page } from "@playwright/test";
import { readDataFile, releaseUrl, test, withDataFolder } from "./helpers.ts";

const FILE = "schuljahr.json";
const OPEN_HOLIDAYS = "https://openholidaysapi.org/**";

const holiday = (id: string, startDate: string, endDate: string, text: string) => ({
  id,
  startDate,
  endDate,
  name: [{ language: "DE", text }],
  nationwide: false,
  subdivisions: [{ code: "DE-BY" }],
});

/** Answers the requests to OpenHolidays with a few days of Bayern. Returns the request URLs. */
async function fakeOpenHolidays(page: Page) {
  const urls: string[] = [];
  const headers = { "Access-Control-Allow-Origin": "*" };
  await page.route(OPEN_HOLIDAYS, (route) => {
    const url = route.request().url();
    urls.push(url);
    const json = url.includes("SchoolHolidays")
      ? [
          holiday("h", "2026-11-02", "2026-11-06", "Herbstferien"),
          holiday("w", "2026-12-24", "2027-01-08", "Weihnachtsferien"),
        ]
      : [
          {
            ...holiday("e", "2026-10-03", "2026-10-03", "Tag der Deutschen Einheit"),
            nationwide: true,
          },
        ];
    return route.fulfill({ headers, json });
  });
  return urls;
}

/** "2026/27" for the school year of today. */
function currentSchoolYear(): string {
  const now = new Date();
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${String(start)}/${String(start + 1).slice(2)}`;
}

test.describe("schuljahr in Chrome and Edge", () => {
  test("loads the holidays once, stores them and reads them after a reload", async ({
    page,
    pageErrors,
  }) => {
    const urls = await fakeOpenHolidays(page);
    await withDataFolder(page);
    await page.goto(releaseUrl("schuljahr.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    await page.getByLabel("Bundesland").selectOption("Bayern");
    await page.getByRole("button", { name: "Ferien laden" }).click();

    const heading = page.getByRole("heading", {
      level: 2,
      name: `Bayern · Schuljahr ${currentSchoolYear()}`,
    });
    await expect(heading).toBeVisible();
    const breaks = page.getByRole("region", { name: "Ferien und freie Tage" });
    await expect(breaks.getByText("Herbstferien")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    expect(urls).toHaveLength(2);
    const saved = JSON.parse((await readDataFile(page, FILE)) ?? "") as {
      data: { selected: { state: string }; years: { holidays: { name: string }[] }[] };
    };
    expect(saved.data.selected.state).toBe("DE-BY");
    expect(saved.data.years[0]?.holidays.map((entry) => entry.name)).toEqual([
      "Tag der Deutschen Einheit",
      "Herbstferien",
      "Weihnachtsferien",
    ]);

    await page.reload();

    await expect(heading).toBeVisible();
    await expect(breaks.getByText("Weihnachtsferien")).toBeVisible();
    expect(urls).toHaveLength(2);
    expect(pageErrors).toEqual([]);
  });

  test("shows a message when the network is down", async ({ page }) => {
    await page.route(OPEN_HOLIDAYS, (route) => route.abort());
    await withDataFolder(page);
    await page.goto(releaseUrl("schuljahr.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    await page.getByLabel("Bundesland").selectOption("Berlin");
    await page.getByRole("button", { name: "Ferien laden" }).click();

    // The browser logs the failed request itself. Thus this test does not check pageErrors.
    await expect(page.getByText(/Keine Verbindung zum Internet/)).toBeVisible();
  });
});
