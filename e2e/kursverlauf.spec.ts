import { expect, type Page } from "@playwright/test";
import {
  dataFileText,
  readDataFile,
  releaseUrl,
  test,
  withDataFolder,
  writeDataFile,
} from "./helpers.ts";

const FILE = "kursverlauf.json";
const ALPHA_VANTAGE = "https://www.alphavantage.co/**";
const TWELVE_DATA = "https://api.twelvedata.com/**";

/** An ISO date `days` days before today. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** 60 weekly prices up to today, like Alpha Vantage sends them. */
function weeklyAnswer(start: number) {
  const weeks = Array.from({ length: 60 }, (_, index): [string, Record<string, string>] => [
    daysAgo((59 - index) * 7),
    { "4. close": String(start + index), "5. adjusted close": String(start + index) },
  ]);
  return { "Weekly Adjusted Time Series": Object.fromEntries(weeks) };
}

/** Answers the requests to Alpha Vantage and Twelve Data. Returns the URLs of Alpha Vantage. */
async function fakeApis(page: Page) {
  const prices: string[] = [];
  const headers = { "Access-Control-Allow-Origin": "*" };
  await page.route(TWELVE_DATA, (route) =>
    route.fulfill({
      headers,
      json: {
        data: [{ symbol: "VGWL", instrument_name: "Vanguard FTSE All-World", mic_code: "XETR" }],
      },
    }),
  );
  await page.route(ALPHA_VANTAGE, (route) => {
    prices.push(route.request().url());
    return route.fulfill({ headers, json: weeklyAnswer(140) });
  });
  return prices;
}

test.describe("kursverlauf in Chrome and Edge", () => {
  test("adds an ETF, shows its prices and keeps them for the day", async ({ page, pageErrors }) => {
    const priceRequests = await fakeApis(page);
    await withDataFolder(page);
    await page.goto(releaseUrl("kursverlauf.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    await page.getByLabel("API-Key").fill("TESTKEY123");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.getByRole("button", { name: "ETF hinzufügen" }).click();
    await page.getByLabel("ISIN oder Kürzel").fill("IE00B3RBWM25");
    await page.getByRole("button", { name: "Suchen" }).click();
    await page.getByRole("button", { name: "Hinzufügen" }).click();

    await expect(
      page.getByRole("heading", { level: 3, name: "Vanguard FTSE All-World" }),
    ).toBeVisible();
    await expect(page.getByText("199,00 €").first()).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse((await readDataFile(page, FILE)) ?? "") as {
      data: { apiKey: string; etfs: { isin: string; symbol: string }[] };
    };
    expect(saved.data.apiKey).toBe("TESTKEY123");
    expect(saved.data.etfs).toMatchObject([{ isin: "IE00B3RBWM25", symbol: "VGWL.DEX" }]);

    await page.reload();

    await expect(page.getByText("199,00 €").first()).toBeVisible();
    expect(priceRequests).toHaveLength(1);
    expect(pageErrors).toEqual([]);
  });

  test("shows the stored prices and a message when the network is down", async ({ page }) => {
    await page.route(ALPHA_VANTAGE, (route) => route.abort());
    await withDataFolder(page);
    await page.goto(releaseUrl("kursverlauf.html"));
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    await writeDataFile(
      page,
      FILE,
      dataFileText("kursverlauf", 2, {
        apiKey: "TESTKEY123",
        etfs: [{ id: "a", isin: "", symbol: "VGWL.DEX", name: "Vanguard" }],
        prices: {
          "VGWL.DEX": {
            fetchedAt: yesterday,
            points: [{ date: daysAgo(3), close: 161.68, total: 161.68 }],
          },
        },
      }),
    );
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    await expect(page.getByText("Keine Verbindung zu Alpha Vantage.")).toBeVisible();
    await expect(page.getByText("161,68 €").first()).toBeVisible();
  });
});
