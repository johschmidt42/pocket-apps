import { expect } from "@playwright/test";
import {
  dataFileText,
  readDataFile,
  releaseUrl,
  test,
  withDataFolder,
  writeDataFile,
} from "./helpers.ts";

test.describe("zeitstrahl in Chrome and Edge", () => {
  test("shows an example, adds entries, hides one and keeps all after a reload", async ({
    page,
    pageErrors,
  }) => {
    await withDataFolder(page);
    await page.goto(releaseUrl("zeitstrahl.html"));
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    // Without entries, the app shows an example. The example is not in the data file.
    await expect(page.getByRole("heading", { level: 2, name: "Mein Zeitstrahl" })).toBeVisible();
    await page.getByText("Studium", { exact: true }).hover();
    await expect(page.getByRole("tooltip")).toContainText("Bachelor und Master in Informatik");

    for (const [title, date] of [
      ["Zahnarzt", "2026-12-03"],
      ["Hausarzt", "2026-12-17"],
    ] as const) {
      await page.getByRole("button", { name: "Neuer Eintrag" }).click();
      await page.getByLabel("Bezeichnung").fill(title);
      await page.getByLabel("Genauigkeit").selectOption("day");
      await page.getByLabel("Datum").fill(date);
      await page.getByRole("button", { name: "Speichern" }).click();
    }
    await expect(page.getByRole("button", { name: /^Zahnarzt/ })).toContainText("03.12.2026");
    await expect(page.getByText("Studium", { exact: true })).toHaveCount(0);

    // The trunk takes a click along its full length, also next to a card.
    const trunk = page.getByRole("button", { name: /^Farbe des Stamms ändern/ });
    const trunkBox = await trunk.boundingBox();
    const cardBox = await page.getByRole("button", { name: /^Hausarzt/ }).boundingBox();
    expect(trunkBox && cardBox).toBeTruthy();
    if (trunkBox && cardBox) {
      await trunk.click({
        position: { x: trunkBox.width / 2, y: cardBox.y + cardBox.height / 2 - trunkBox.y },
      });
    }
    await expect(
      page.getByRole("button", { name: "Farbe des Stamms ändern, jetzt Grün" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "„Zahnarzt“ ausblenden" }).click();
    await expect(page.getByRole("button", { name: /^Zahnarzt/ })).toHaveCount(0);
    // The mouse was on the hidden card. The other cards do not fade.
    await expect(page.getByRole("button", { name: /^Hausarzt/ }).locator("..")).not.toHaveClass(
      /opacity-50/,
    );

    await page.getByRole("radio", { name: "Lücken kürzen" }).click();
    await expect(page.getByRole("status")).toHaveText("Gespeichert");
    const saved = JSON.parse((await readDataFile(page, "zeitstrahl.json")) ?? "") as {
      data: {
        timelines: {
          scale: string;
          trunk: string;
          entries: { title: string; visible: boolean; when: { kind: string } }[];
        }[];
      };
    };
    const timeline = saved.data.timelines[0];
    expect(timeline?.scale).toBe("compact");
    expect(timeline?.trunk).toBe("green");
    expect(timeline?.entries).toMatchObject([
      { title: "Zahnarzt", when: { kind: "point" }, visible: false },
      { title: "Hausarzt", when: { kind: "point" }, visible: true },
    ]);

    await page.reload();

    await expect(page.getByRole("button", { name: /^Hausarzt/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Zahnarzt/ })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "Lücken kürzen" })).toBeChecked();
    expect(pageErrors).toEqual([]);
  });
  test("shows the right description when the mouse goes from leaf to leaf", async ({
    page,
    pageErrors,
  }) => {
    // 1000 px: the bubbles go above the cards and cover the card above.
    await page.setViewportSize({ width: 1000, height: 900 });
    await withDataFolder(page);
    await page.goto(releaseUrl("zeitstrahl.html"));
    const entry = (id: string, title: string, start: string, description: string) => ({
      id,
      title,
      description,
      when: { kind: "range", start, end: start },
      side: "right",
      visible: true,
    });
    await writeDataFile(
      page,
      "zeitstrahl.json",
      dataFileText("zeitstrahl", 1, {
        activeTimelineId: "a",
        timelines: [
          {
            id: "a",
            name: "Test",
            scale: "real",
            trunk: "gray",
            entries: [
              entry("1", "Erstes", "2020", "Text vom ersten Blatt"),
              entry("2", "Zweites", "2021", "Text vom zweiten Blatt"),
            ],
          },
        ],
      }),
    );
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    const first = page.getByRole("button", { name: /^Erstes/ });
    const second = page.getByRole("button", { name: /^Zweites/ });
    await expect(second).toHaveCSS("cursor", "pointer");
    await second.hover();
    await expect(page.getByRole("tooltip")).toHaveText("Text vom zweiten Blatt");
    await first.hover();
    // The old bubble closes with an animation. Then only the new bubble is left.
    await expect(page.getByRole("tooltip")).toHaveCount(1);
    await expect(page.getByRole("tooltip")).toHaveText("Text vom ersten Blatt");
    expect(pageErrors).toEqual([]);
  });
  test("keeps a bubble at its side while it fades out", async ({ page, pageErrors }) => {
    // 1300 px: the bubble of a card right of the trunk goes to the right of the card.
    await page.setViewportSize({ width: 1300, height: 900 });
    await withDataFolder(page);
    await page.goto(releaseUrl("zeitstrahl.html"));
    await writeDataFile(
      page,
      "zeitstrahl.json",
      dataFileText("zeitstrahl", 1, {
        activeTimelineId: "a",
        timelines: [
          {
            id: "a",
            name: "Test",
            scale: "real",
            trunk: "gray",
            entries: [
              {
                id: "1",
                title: "Job",
                description: "Text vom Blatt",
                when: { kind: "range", start: "2020", end: "2022" },
                side: "right",
                visible: true,
              },
            ],
          },
        ],
      }),
    );
    await page.getByRole("button", { name: "Ordner wählen …" }).click();
    await page.getByRole("button", { name: /^Job/ }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Text vom Blatt");

    // Record the side of the bubble in each frame while the mouse leaves the card.
    await page.evaluate(() => {
      const sides: string[] = [];
      Object.assign(window, { bubbleSides: sides });
      const record = () => {
        for (const bubble of document.querySelectorAll("[data-slot=tooltip-content]")) {
          sides.push(bubble.getAttribute("data-side") ?? "");
        }
        if (sides.length < 200) requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
    await page.mouse.move(5, 5);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    const sides = await page.evaluate(
      () => (window as unknown as { bubbleSides: string[] }).bubbleSides,
    );
    expect(sides.length).toBeGreaterThan(0);
    expect(new Set(sides)).toEqual(new Set(["right"]));
    expect(pageErrors).toEqual([]);
  });
  test("shows the description and the dates on the trunk on a branch", async ({
    page,
    pageErrors,
  }) => {
    await page.setViewportSize({ width: 1300, height: 900 });
    await withDataFolder(page);
    await page.goto(releaseUrl("zeitstrahl.html"));
    await writeDataFile(
      page,
      "zeitstrahl.json",
      dataFileText("zeitstrahl", 1, {
        activeTimelineId: "a",
        timelines: [
          {
            id: "a",
            name: "Test",
            scale: "real",
            trunk: "gray",
            entries: [
              {
                id: "study",
                title: "Studium",
                description: "Informatik",
                when: { kind: "range", start: "2013-10", end: "2018-09" },
                side: "left",
                visible: true,
              },
            ],
          },
        ],
      }),
    );
    await page.getByRole("button", { name: "Ordner wählen …" }).click();

    // The branch is a picture (aria-hidden). It has the ID of its entry as an attribute.
    await page.locator('[data-branch-of="study"]').hover();
    await expect(page.getByRole("tooltip")).toHaveText("Informatik");
    await expect(page.getByText("10/2013", { exact: true })).toBeVisible();
    await expect(page.getByText("09/2018", { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
