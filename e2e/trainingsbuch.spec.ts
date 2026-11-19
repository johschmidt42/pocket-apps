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

    // A reload shows the open workout again. The back button of the browser shows the list.
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Fran" })).toBeVisible();
    await page.goBack();
    await page.getByRole("tab", { name: "Verlauf" }).click();

    await expect(page.getByRole("button", { name: /^Fran.*4:05/ })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("heading", { level: 2, name: "Fran" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("goes back to the list at the same place, also after a bookmark", async ({
    page,
    pageErrors,
  }) => {
    await withDataFolder(page);
    await page.goto(releaseUrl("trainingsbuch.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    // Murph is far down in the list.
    const murph = page.getByRole("button", { name: /^Murph/ });
    await murph.scrollIntoViewIfNeeded();
    const listScroll = await page.evaluate(() => window.scrollY);
    expect(listScroll).toBeGreaterThan(500);
    // A click with the mouse: `murph.click()` can scroll the page again before the click.
    const box = await murph.boundingBox();
    if (box === null) throw new Error("The card of Murph has no size.");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole("heading", { level: 2, name: "Murph" })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.goBack();
    await expect(murph).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(listScroll);

    // A bookmark of the detail in a new page load: the back button shows the list and stays in
    // the app.
    await page.goto("about:blank");
    await page.goto(`${releaseUrl("trainingsbuch.html")}#murph`);
    await expect(page.getByRole("heading", { level: 2, name: "Murph" })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("tab", { name: "Workouts" })).toBeVisible();
    expect(page.url()).toBe(releaseUrl("trainingsbuch.html"));
    expect(pageErrors).toEqual([]);
  });

  test("records a result with the AI after the user confirms it", async ({ page, pageErrors }) => {
    const now = new Date();
    const today = [
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    const cors = { "access-control-allow-origin": "*" };
    // The tests have no internet. Fake answers stand for the Claude API.
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
          ],
          has_more: false,
        },
        headers: cors,
      }),
    );
    const answer = {
      status: "draft",
      message: "Fran in 6:42, Rx.",
      draft: {
        workoutId: "fran",
        newWorkout: null,
        date: today,
        division: "rx",
        score: { seconds: 402, capped: false, rounds: null, reps: null, kg: null },
        loadKg: null,
        notes: "Pull-ups in 3 Sätzen",
      },
    };
    const requests: string[] = [];
    await page.route("https://api.anthropic.com/v1/messages**", (route) => {
      requests.push(route.request().postData() ?? "");
      return route.fulfill({
        json: {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: [{ type: "text", text: JSON.stringify(answer) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 3000, output_tokens: 120 },
        },
        headers: cors,
      });
    });
    await withDataFolder(page);
    await page.goto(releaseUrl("trainingsbuch.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    // Without a key, the dialog first asks for the AI setup.
    await page.getByRole("button", { name: "Mit KI eintragen" }).click();
    const entry = page.getByRole("dialog", { name: "Mit KI eintragen" });
    await entry.getByRole("button", { name: "KI einrichten" }).click();
    const setup = page.getByRole("dialog", { name: "KI einrichten" });
    await setup.getByLabel("API-Key").fill("sk-ant-e2e");
    await setup.getByRole("button", { name: "Verbindung prüfen" }).click();
    await expect(setup.getByText(/Der Key funktioniert/)).toBeVisible();
    await setup.getByRole("button", { name: "Speichern" }).click();
    await expect(setup).toBeHidden();

    await entry.getByLabel("Was hast du trainiert?").fill("Fran 6:42 Rx, Pull-ups in 3 Sätzen");
    await entry.getByRole("button", { name: "Senden" }).click();
    const card = entry.getByRole("region", { name: "Dein Eintrag" });
    await expect(card.getByText("6:42 · Rx")).toBeVisible();
    await expect(entry.getByText("3.120 Token")).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("Fran 6:42 Rx, Pull-ups in 3 Sätzen");
    expect(requests[0]).toContain('"cache_control":{"type":"ephemeral"}');

    await card.getByRole("button", { name: "Ergebnis speichern" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Fran" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const file = (await readDataFile(page, "trainingsbuch/trainingsbuch.json")) ?? "";
    expect(JSON.parse(file)).toMatchObject({
      data: { results: [{ workoutId: "fran", date: today, notes: "Pull-ups in 3 Sätzen" }] },
    });
    expect(file).not.toContain("sk-ant-e2e");

    // A reload shows the open workout again.
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Fran" })).toBeVisible();
    await page.getByRole("button", { name: "Alle Workouts" }).click();
    await page.getByRole("tab", { name: "Verlauf" }).click();
    await expect(page.getByRole("button", { name: /^Fran.*6:42/ })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
