import { expect, type Page, type Route } from "@playwright/test";
import { releaseUrl, test } from "./helpers.ts";

const AUTHORIZE = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?**";
const TOKEN = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const APP_ROOT = "https://graph.microsoft.com/v1.0/me/drive/special/approot:/";
const FILE = "app-ideen/app-ideen.json";
const CORS = { "access-control-allow-origin": "*" };

/**
 * The tests have no internet. These fakes stand for the Microsoft login and for OneDrive. The
 * files of OneDrive live in `files`.
 */
async function fakeMicrosoft(page: Page) {
  const files = new Map<string, { text: string; time: string }>();
  const tokenForms: Record<string, string>[] = [];
  let clock = Date.parse("2026-11-19T12:00:00Z");

  // The login sends the person back to the start page with a code, like Microsoft.
  await page.route(AUTHORIZE, (route) => {
    const url = new URL(route.request().url());
    const back = new URL(url.searchParams.get("redirect_uri") ?? "");
    back.searchParams.set("code", "e2e-code");
    back.searchParams.set("state", url.searchParams.get("state") ?? "");
    return route.fulfill({ status: 302, headers: { location: back.href } });
  });
  await page.route(TOKEN, (route) => {
    tokenForms.push(Object.fromEntries(new URLSearchParams(route.request().postData() ?? "")));
    return route.fulfill({
      headers: CORS,
      json: { access_token: "e2e-access", refresh_token: "e2e-refresh", expires_in: 3600 },
    });
  });
  await page.route(`${APP_ROOT}**`, (route: Route) => {
    const request = route.request();
    const [path = "", rest = ""] = decodeURIComponent(request.url().slice(APP_ROOT.length)).split(
      ":",
    );
    const file = files.get(path);
    if (request.method() === "PUT") {
      clock += 1000;
      const time = new Date(clock).toISOString();
      files.set(path, { text: request.postData() ?? "", time });
      return route.fulfill({ headers: CORS, json: { lastModifiedDateTime: time } });
    }
    if (!file) return route.fulfill({ status: 404, headers: CORS, body: "missing" });
    if (request.method() === "DELETE") {
      files.delete(path);
      return route.fulfill({ status: 204, headers: CORS });
    }
    return rest === "/content"
      ? route.fulfill({ headers: CORS, body: file.text })
      : route.fulfill({ headers: CORS, json: { lastModifiedDateTime: file.time } });
  });
  return { files, tokenForms };
}

test.describe("data in OneDrive", () => {
  test("logs in over the start page, saves in OneDrive and loads the data again", async ({
    page,
    pageErrors,
  }) => {
    const microsoft = await fakeMicrosoft(page);
    await page.goto(releaseUrl("app-ideen.html"));

    await page.getByRole("button", { name: "Mit OneDrive verbinden" }).click();

    // The start page ends the login and goes back to the app.
    await expect(page).toHaveURL(releaseUrl("app-ideen.html"));
    expect(microsoft.tokenForms).toEqual([
      expect.objectContaining({
        grant_type: "authorization_code",
        code: "e2e-code",
        redirect_uri: releaseUrl(""),
      }),
    ]);
    await expect(page.getByText(`OneDrive / ${FILE}`)).toBeVisible();

    await page.getByLabel("Titel").fill("Pflanzen");
    await page.getByRole("button", { name: "Hinzufügen" }).click();
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    expect(microsoft.files.get(FILE)?.text).toContain('"title": "Pflanzen"');

    // A new visit uses OneDrive again, without a new login.
    await page.reload();
    await expect(page.getByRole("heading", { level: 3, name: "Pflanzen" })).toBeVisible();
    expect(microsoft.tokenForms).toHaveLength(1);
    // OneDrive answers 404 for a file that does not exist yet, for example on the first visit.
    // Chrome writes each 404 answer to the console. All other errors count.
    const notFound =
      "console error: Failed to load resource: the server responded with a status of 404 (Not Found)";
    expect(pageErrors.filter((error) => error !== notFound)).toEqual([]);
  });
});
