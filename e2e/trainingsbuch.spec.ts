import { expect, type Page } from "@playwright/test";
import { readDataFile, releaseUrl, test, withDataFolder } from "./helpers.ts";

/** The date of today as "YYYY-MM-DD", in local time like the app. */
function todayText(): string {
  const now = new Date();
  return [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * The tests have no internet. Fake answers stand for the Claude API: the model list and one
 * answer for each request. Returns the bodies of the requests.
 */
async function fakeClaude(page: Page, answer: unknown): Promise<string[]> {
  const cors = { "access-control-allow-origin": "*" };
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
  return requests;
}

/** Sets up the AI with a fake key: the dialog "Mit KI eintragen" asks for it first. */
async function setUpAi(page: Page) {
  const entry = page.getByRole("dialog", { name: "Mit KI eintragen" });
  await entry.getByRole("button", { name: "KI einrichten" }).click();
  const setup = page.getByRole("dialog", { name: "KI einrichten" });
  await setup.getByLabel("API-Key").fill("sk-ant-e2e");
  await setup.getByRole("button", { name: "Verbindung prüfen" }).click();
  await expect(setup.getByText(/Der Key funktioniert/)).toBeVisible();
  await setup.getByRole("button", { name: "Speichern" }).click();
  await expect(setup).toBeHidden();
  return entry;
}

test.describe("trainingsbuch in Chrome and Edge", () => {
  test("shows moving exercise figures in an opened workout", async ({ page, pageErrors }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await withDataFolder(page);
    await page.goto(releaseUrl("trainingsbuch.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: /^Fran/ }).click();

    const thruster = page.getByRole("button", { name: "Thruster von der Seite anhalten" });
    await thruster.scrollIntoViewIfNeeded();
    const first = await thruster.innerHTML();
    await expect.poll(() => thruster.innerHTML()).not.toBe(first);

    await page
      .getByRole("radiogroup", { name: "Variante von Pull-up" })
      .getByRole("radio", { name: "Strict" })
      .click();
    await expect(
      page.getByRole("button", { name: "Pull-up Strict von der Seite anhalten" }),
    ).toBeVisible();

    await thruster.click();
    const stopped = page.getByRole("button", { name: "Thruster von der Seite abspielen" });
    const paused = await stopped.innerHTML();
    await page.waitForTimeout(200);
    expect(await stopped.innerHTML()).toBe(paused);

    await page.getByRole("button", { name: "Thruster von vorn zeigen" }).click();
    await expect(page.getByRole("button", { name: "Thruster von vorn abspielen" })).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(320);
    expect(pageErrors).toEqual([]);
  });

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
    // The mouse stays where the button was. A card under the mouse grows on hover, and the page
    // then keeps the scroll position a few pixels off. Move the mouse away from the list.
    await page.mouse.move(0, 0);

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
    const today = todayText();
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
    const requests = await fakeClaude(page, answer);
    await withDataFolder(page);
    await page.goto(releaseUrl("trainingsbuch.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    // Without a key, the dialog first asks for the AI setup.
    await page.getByRole("button", { name: "Mit KI eintragen" }).click();
    const entry = await setUpAi(page);

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

test.describe("trainingsbuch on a phone", () => {
  test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

  test("takes a photo with the camera and sends a smaller JPEG to the AI", async ({
    page,
    pageErrors,
  }) => {
    const requests = await fakeClaude(page, {
      status: "question",
      message: "Welches Workout ist das?",
      draft: null,
    });
    await withDataFolder(page);
    await page.goto(releaseUrl("trainingsbuch.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: "Mit KI eintragen" }).click();
    const entry = await setUpAi(page);

    // A camera photo: 4000 × 3000 pixels and larger than the limit of 3.75 MiB.
    const photo = await page.evaluate(async () => {
      const canvas = new OffscreenCanvas(4000, 3000);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no 2D context");
      const pixels = context.createImageData(4000, 3000);
      for (let index = 0; index < pixels.data.length; index += 1) {
        pixels.data[index] = index % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
      }
      context.putImageData(pixels, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let text = "";
      for (const byte of bytes) text += String.fromCharCode(byte);
      return btoa(text);
    });
    const buffer = Buffer.from(photo, "base64");
    expect(buffer.length).toBeGreaterThan((5 * 1024 * 1024 * 3) / 4);

    await expect(entry.getByRole("button", { name: "Foto aufnehmen" })).toBeVisible();
    await entry
      .getByLabel("Kamera")
      .setInputFiles({ name: "kamera.jpg", mimeType: "image/jpeg", buffer });
    await expect(entry.getByText("kamera.jpg")).toBeVisible();
    await entry.getByRole("button", { name: "Senden" }).click();
    await expect(entry.getByText("Welches Workout ist das?")).toBeVisible();

    // The AI got a JPEG with 1568 pixels on the long edge.
    type Part = { type: string; source?: { media_type: string; data: string } };
    const body = JSON.parse(requests[0] ?? "") as { messages: { content: Part[] }[] };
    const image = body.messages[0]?.content.find((part) => part.type === "image")?.source;
    expect(image?.media_type).toBe("image/jpeg");
    const size = await page.evaluate(async (base64) => {
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
      return [bitmap.width, bitmap.height];
    }, image?.data ?? "");
    expect(size).toEqual([1568, 1176]);
    expect(pageErrors).toEqual([]);
  });
});
