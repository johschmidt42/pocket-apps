import { expect } from "@playwright/test";
import {
  listApps,
  readDataFile,
  releaseUrl,
  test,
  withDataFolder,
  withoutFolderAccess,
} from "./helpers.ts";

test.describe("launcher (release/index.html)", () => {
  test.beforeEach(async ({ page, pageErrors }) => {
    expect(pageErrors).toEqual([]);
    await page.goto(releaseUrl("index.html"));
  });

  test("shows a card for every app with version and data badge", async ({ page, pageErrors }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Pocket Apps" })).toBeVisible();
    for (const app of listApps()) {
      const card = page.getByRole("link", { name: app.title });
      await expect(card).toHaveAttribute("href", `./${app.name}.html`);
      await expect(card).toContainText(app.version);
      await expect(
        card.getByRole("img", {
          name: app.stateful ? "Speichert Daten in einer eigenen Datei" : "Speichert keine Daten",
        }),
      ).toBeVisible();
      await expect(card.getByRole("img", { name: "Nutzt keine Online-Dienste" })).toHaveCount(
        app.network ? 0 : 1,
      );
      await expect(card.getByRole("img", { name: "Nutzt Online-Dienste" })).toHaveCount(
        app.apis ? 1 : 0,
      );
      await expect(card.getByRole("img", { name: /Nutzt KI/ })).toHaveCount(app.ai ? 1 : 0);
    }
    await expect(page.getByRole("link", { name: "Alle Apps" })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test("opens an app and comes back", async ({ page }) => {
    const first = listApps()[0];
    if (!first) throw new Error("There are no apps.");

    await page.getByRole("link", { name: first.title }).click();
    await expect(page.getByRole("heading", { level: 1, name: first.title })).toBeVisible();

    await page.getByRole("link", { name: "Alle Apps" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Pocket Apps" })).toBeVisible();
  });

  test("shows a tooltip when the mouse is on an icon", async ({ page }) => {
    const first = listApps()[0];
    if (!first) throw new Error("There are no apps.");
    const label = first.stateful
      ? "Speichert Daten in einer eigenen Datei"
      : "Speichert keine Daten";

    await page.getByRole("link", { name: first.title }).getByRole("img", { name: label }).hover();

    await expect(page.getByRole("tooltip")).toHaveText(label);
  });

  test("filters the apps by the search text", async ({ page }) => {
    await page.getByLabel("Apps durchsuchen").fill("zzz-nothing");

    await expect(page.getByText("Keine App passt")).toBeVisible();
  });

  test("starts in light mode and switches to dark mode", async ({ page }) => {
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Dunkles Design" }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("keeps dark mode when the user opens an app", async ({ page }) => {
    const first = listApps()[0];
    if (!first) throw new Error("There are no apps.");

    await page.getByRole("button", { name: "Dunkles Design" }).click();
    await page.getByRole("link", { name: first.title }).click();

    await expect(page.getByRole("heading", { level: 1, name: first.title })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("fits into a narrow window without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("launcher with the data folder", () => {
  test("sets up the folder for all apps and keeps the order of the apps", async ({
    page,
    pageErrors,
  }) => {
    const apps = listApps();
    const last = apps.at(-1);
    if (!last || apps.length < 2) throw new Error("This test needs two apps.");
    // The drag goes from the last row to the first row. Both rows must be in the window:
    // the drag of the browser does not scroll.
    await page.setViewportSize({ width: 1280, height: 400 + apps.length * 80 });
    await withDataFolder(page);
    await page.goto(releaseUrl("index.html"));

    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: "Reihenfolge ändern" }).click();
    // Drag the last app by its grip onto the upper half of the first app.
    const grip = page.getByRole("button", { name: `${last.title} verschieben` });
    await expect(grip).toHaveCSS("cursor", "grab");
    const first = apps[0];
    if (!first) throw new Error("This test needs two apps.");
    await grip.dragTo(page.getByRole("heading", { level: 3, name: first.title }), {
      targetPosition: { x: 5, y: 2 },
    });
    await page.getByRole("button", { name: "Fertig" }).click();

    const cards = page.getByRole("main").getByRole("list").getByRole("link");
    await expect(cards.first()).toHaveAccessibleName(last.title);
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse((await readDataFile(page, "launcher/launcher.json")) ?? "") as {
      data: { order: string[] };
    };
    expect(saved.data.order[0]).toBe(last.name);

    await page.reload();

    await expect(cards.first()).toHaveAccessibleName(last.title);

    // A stateful app uses the same folder. It does not ask again.
    const stateful = apps.find((app) => app.stateful);
    if (stateful) {
      await page.getByRole("link", { name: stateful.title }).click();
      await expect(page.getByText(`/ ${stateful.name}/${stateful.name}.json`)).toBeVisible();
    }
    expect(pageErrors).toEqual([]);
  });
});

test.describe("launcher on a phone", () => {
  test.use({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true });

  test("moves an app with a finger, and the list scrolls at the bottom edge", async ({
    page,
    pageErrors,
  }) => {
    const apps = listApps();
    const first = apps[0];
    const last = apps.at(-1);
    if (!first || !last || apps.length < 2) throw new Error("This test needs two apps.");
    await withDataFolder(page);
    await page.goto(releaseUrl("index.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: "Reihenfolge ändern" }).click();
    const grips = page.getByRole("button", { name: / verschieben$/ });
    const grip = page.getByRole("button", { name: `${first.title} verschieben` });
    const box = await grip.boundingBox();
    if (!box) throw new Error("The grip has no size.");

    // A real touch of Chrome: it gives pointer events with the pointer type "touch".
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: box.x + box.width / 2, y }],
      });
    await touch("touchStart", box.y + box.height / 2);
    for (let y = box.y + box.height / 2; y < 690; y += 40) await touch("touchMove", y);
    await touch("touchMove", 690);
    // The finger stays at the bottom edge: the list scrolls until the app is the last one.
    await expect(grips.last()).toHaveAccessibleName(`${first.title} verschieben`);
    await touch("touchEnd", 690);
    await page.getByRole("button", { name: "Fertig" }).click();

    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse((await readDataFile(page, "launcher/launcher.json")) ?? "") as {
      data: { order: string[] };
    };
    expect(saved.data.order.at(-1)).toBe(first.name);
    expect(saved.data.order[0]).not.toBe(first.name);
    expect(pageErrors).toEqual([]);
  });
});

test.describe("launcher with favorites", () => {
  test("shows a favorite first and keeps it after a reload", async ({ page, pageErrors }) => {
    const last = listApps().at(-1);
    if (!last) throw new Error("There are no apps.");
    await withDataFolder(page);
    await page.goto(releaseUrl("index.html"));

    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: `${last.title} zu Favoriten hinzufügen` }).click();

    const favorites = page.getByRole("region", { name: "Favoriten" });
    await expect(favorites.getByRole("link")).toHaveAccessibleName(last.title);
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse((await readDataFile(page, "launcher/launcher.json")) ?? "") as {
      data: { favorites: string[] };
    };
    expect(saved.data.favorites).toEqual([last.name]);

    await page.reload();

    await expect(favorites.getByRole("link")).toHaveAccessibleName(last.title);
    await expect(
      page.getByRole("button", { name: `${last.title} aus Favoriten entfernen` }),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

test.describe("launcher in browsers without folder access", () => {
  test("shows the apps and offers only the cloud storages", async ({ page }) => {
    await withoutFolderAccess(page);
    await page.goto(releaseUrl("index.html"));

    await expect(page.getByRole("button", { name: "Mit OneDrive verbinden" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mit Dropbox verbinden" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ordner wählen …" })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link")).toHaveCount(listApps().length);
    await expect(page.getByRole("button", { name: "Reihenfolge ändern" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Favoriten/ })).toHaveCount(0);
  });
});

test.describe("launcher AI settings", () => {
  test("checks a key, saves provider and model in ai/ai.json and the key only in the browser", async ({
    page,
    pageErrors,
  }) => {
    // The tests have no internet. A fake answer stands for the model list of Anthropic.
    await page.route("https://api.anthropic.com/v1/models**", (route) =>
      route.fulfill({
        json: {
          data: [
            {
              type: "model",
              id: "claude-opus-5-5",
              display_name: "Claude Opus 5.5",
              created_at: "2026-10-01T00:00:00Z",
            },
            {
              type: "model",
              id: "claude-haiku-5-5",
              display_name: "Claude Haiku 5.5",
              created_at: "2026-09-01T00:00:00Z",
            },
          ],
          has_more: false,
        },
        headers: { "access-control-allow-origin": "*" },
      }),
    );
    await withDataFolder(page);
    await page.goto(releaseUrl("index.html"));
    // The policy allows only the own address, the AI providers and OneDrive.
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      "content",
      "connect-src 'self' https://api.anthropic.com https://api.openai.com " +
        "https://login.microsoftonline.com https://graph.microsoft.com https://*.1drv.com " +
        "https://*.microsoftpersonalcontent.com https://*.sharepoint.com " +
        "https://api.dropboxapi.com https://content.dropboxapi.com",
    );

    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: "KI einrichten" }).click();
    const dialog = page.getByRole("dialog", { name: "KI einrichten" });
    await dialog.getByLabel("API-Key").fill("sk-ant-e2e");
    await dialog.getByRole("button", { name: "Verbindung prüfen" }).click();
    await expect(dialog.getByText(/Der Key funktioniert\. 2 Modelle verfügbar\./)).toBeVisible();
    await expect(dialog.getByLabel("Modell")).toHaveValue("claude-opus-5-5");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(dialog).toBeHidden();

    const file = (await readDataFile(page, "ai/ai.json")) ?? "";
    expect(JSON.parse(file)).toMatchObject({
      app: "ai",
      data: { active: "anthropic", models: { anthropic: "claude-opus-5-5", openai: null } },
    });
    expect(file).not.toContain("sk-ant-e2e");

    // The key stays in the browser after a reload.
    await page.reload();
    await page.getByRole("button", { name: "KI einrichten" }).click();
    await expect(page.getByRole("dialog").getByLabel("API-Key")).toHaveValue("sk-ant-e2e");
    expect(pageErrors).toEqual([]);
  });
});
