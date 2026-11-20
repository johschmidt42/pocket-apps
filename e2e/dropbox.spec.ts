import { expect, type Page, type Route } from "@playwright/test";
import { releaseUrl, test } from "./helpers.ts";

const AUTHORIZE = "https://www.dropbox.com/oauth2/authorize?**";
const TOKEN = "https://api.dropboxapi.com/oauth2/token";
const API = "https://api.dropboxapi.com/2/";
const CONTENT = "https://content.dropboxapi.com/2/";
const FILE = "/app-ideen/app-ideen.json";
const CORS = { "access-control-allow-origin": "*" };

/**
 * The tests have no internet. These fakes stand for the Dropbox login and the Dropbox API. The
 * files of the app folder live in `files`.
 */
async function fakeDropbox(page: Page) {
  const files = new Map<string, { text: string; rev: string; time: string }>();
  const tokenForms: Record<string, string>[] = [];
  let clock = Date.parse("2026-11-20T12:00:00Z");
  const notFound = (route: Route, summary: string) =>
    route.fulfill({ status: 409, headers: CORS, json: { error_summary: summary } });

  // The login sends the person back to the start page with a code, like Dropbox.
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
      json: { access_token: "e2e-access", refresh_token: "e2e-refresh", expires_in: 14400 },
    });
  });
  const handle = (route: Route) => {
    const request = route.request();
    const endpoint = request.url().replace(API, "").replace(CONTENT, "");
    const header = request.headers()["dropbox-api-arg"];
    const arg = JSON.parse(header ?? request.postData() ?? "{}") as { path: string };
    const file = files.get(arg.path);
    if (endpoint === "files/get_metadata") {
      return file
        ? route.fulfill({ headers: CORS, json: { server_modified: file.time, rev: file.rev } })
        : notFound(route, "path/not_found/");
    }
    if (endpoint === "files/download") {
      // Like Dropbox: the metadata is in a header, and the page may read it.
      return file
        ? route.fulfill({
            headers: {
              ...CORS,
              "Access-Control-Expose-Headers": "Dropbox-API-Result",
              "Dropbox-API-Result": JSON.stringify({ server_modified: file.time, rev: file.rev }),
            },
            body: file.text,
          })
        : notFound(route, "path/not_found/");
    }
    // files/upload
    clock += 1000;
    const saved = {
      text: request.postData() ?? "",
      rev: `rev-${String(clock)}`,
      time: new Date(clock).toISOString().replace(/\.\d+Z$/, "Z"),
    };
    files.set(arg.path, saved);
    return route.fulfill({ headers: CORS, json: { server_modified: saved.time, rev: saved.rev } });
  };
  await page.route(`${API}**`, handle);
  await page.route(`${CONTENT}**`, handle);
  return { files, tokenForms };
}

test.describe("data in Dropbox", () => {
  test("logs in over the start page, saves in Dropbox and loads the data again", async ({
    page,
    pageErrors,
  }) => {
    const dropbox = await fakeDropbox(page);
    await page.goto(releaseUrl("app-ideen.html"));

    await page.getByRole("button", { name: "Mit Dropbox verbinden" }).click();

    // The start page ends the login and goes back to the app.
    await expect(page).toHaveURL(releaseUrl("app-ideen.html"));
    expect(dropbox.tokenForms).toEqual([
      expect.objectContaining({
        grant_type: "authorization_code",
        code: "e2e-code",
        redirect_uri: releaseUrl(""),
      }),
    ]);
    await expect(
      page.getByRole("button", { name: "Dropbox / app-ideen/app-ideen.json" }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "Dropbox" })).toBeVisible();

    await page.getByLabel("Titel").fill("Pflanzen");
    await page.getByRole("button", { name: "Hinzufügen" }).click();
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    expect(dropbox.files.get(FILE)?.text).toContain('"title": "Pflanzen"');

    // A new visit uses Dropbox again, without a new login.
    await page.reload();
    await expect(page.getByRole("heading", { level: 3, name: "Pflanzen" })).toBeVisible();
    expect(dropbox.tokenForms).toHaveLength(1);
    // A file that does not exist yet is an error answer (409). Chrome writes it to the console.
    const missing =
      "console error: Failed to load resource: the server responded with a status of 409 (Conflict)";
    expect(pageErrors.filter((error) => error !== missing)).toEqual([]);
  });
});
