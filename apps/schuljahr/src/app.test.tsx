import type { FetchResult } from "@pocket-apps/core/fetch-json";
import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";
import type { SchoolYear, SchuljahrData } from "./schema.ts";
import { BAYERN_RULES, bayern2026, fakeFetch, rulesFor } from "./test-data.ts";

type Rule = { match: string; result: FetchResult };

function fileText(data: SchuljahrData): string {
  return JSON.stringify({
    app: "schuljahr",
    schemaVersion: 1,
    savedWith: "1.0",
    savedAt: "2026-11-10T12:00:00.000Z",
    data,
  });
}

const STORED: SchuljahrData = {
  selected: { state: "DE-BY", startYear: 2026 },
  years: [bayern2026()],
};

/** Opens the app with a folder. `data` is the content of schuljahr.json, or nothing for a new file. */
async function openApp({
  rules = BAYERN_RULES,
  data,
  today = "2026-11-10",
}: {
  rules?: readonly Rule[];
  data?: SchuljahrData;
  today?: string;
} = {}) {
  const folder = createMemoryFolder();
  if (data) folder.files.set("schuljahr.json", { text: fileText(data), lastModified: 1 });
  const fake = fakeFetch(rules);
  const user = userEvent.setup();
  render(
    <App
      folderHost={createMemoryFolderHost({ saved: folder })}
      fetchJson={fake.fetchJson}
      today={today}
    />,
  );
  await screen.findByText(/schuljahr\.json/);
  return { folder, user, urls: fake.urls };
}

function savedData(folder: ReturnType<typeof createMemoryFolder>): SchuljahrData {
  return (JSON.parse(folder.files.get("schuljahr.json")?.text ?? "") as { data: SchuljahrData })
    .data;
}

describe("schuljahr app", () => {
  it("asks for the state and the school year, loads them once and stores them", async () => {
    const { folder, user, urls } = await openApp();

    expect(screen.getByRole("heading", { level: 2, name: "Schuljahr wählen" })).toBeVisible();
    const load = screen.getByRole("button", { name: "Ferien laden" });
    expect(load).toBeDisabled();
    expect(screen.getByLabelText("Schuljahr")).toHaveValue("2026");
    await user.selectOptions(screen.getByLabelText("Bundesland"), "Bayern");
    await user.click(load);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Bayern · Schuljahr 2026/27" }),
    ).toBeVisible();
    expect(urls).toHaveLength(2);
    expect(screen.getByText("Schultag")).toBeVisible();
    expect(screen.getByText("31 Schultage")).toBeVisible();
    expect(
      screen.getByText(/Weihnachtsferien ab Do\., 24\.12\.2026\. Heute ist mitgezählt\./),
    ).toBeVisible();
    expect(screen.getByText("150 Schultage")).toBeVisible();
    expect(screen.getByText("35 von 185 Schultagen")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Geschaffte Schultage" })).toBeVisible();
    expect(screen.getByText("185 Schultage")).toBeVisible();
    expect(screen.getByText(/93 Ferientage,\s*13 Feiertage/)).toBeVisible();

    await screen.findByText("Gespeichert");
    const saved = savedData(folder);
    expect(saved.selected).toEqual({ state: "DE-BY", startYear: 2026 });
    expect(saved.years.map((year) => year.startYear)).toEqual([2026]);
  });

  it("shows the calendar with a legend and named days, and the list of holidays", async () => {
    await openApp({ data: STORED });

    const legend = screen.getByRole("list", { name: "Legende" });
    expect(within(legend).getByText("Herbstferien")).toBeVisible();
    expect(within(legend).getByText("Feiertage")).toBeVisible();
    // The month names are plain text, not live regions.
    expect(screen.getByText("September 2026")).not.toHaveAttribute("role");
    // School in Bayern starts in September. Thus the calendar has no August.
    expect(screen.queryByText("August 2026")).toBeNull();
    expect(screen.getByText("Juli 2027")).toBeVisible();
    expect(
      screen.getByRole("gridcell", { name: "Mittwoch, 18. November 2026, Buß- und Bettag" }),
    ).toBeVisible();
    expect(screen.getByRole("gridcell", { name: "Dienstag, 10. November 2026" })).toBeVisible();

    const breaks = screen.getByRole("region", { name: "Ferien und freie Tage" });
    // Only the holidays of this school year: not the summer holidays from August 2, 2027.
    expect(within(breaks).getAllByRole("listitem")).toHaveLength(7);
    expect(within(breaks).getByText("· noch 6 Schultage")).toBeVisible();
    expect(within(breaks).getByText("· noch 31 Schultage")).toBeVisible();
    expect(within(breaks).getByText("(16 Tage)")).toBeVisible();
    const publicHolidays = screen.getByRole("region", { name: "Feiertage" });
    expect(within(publicHolidays).getByText("Fronleichnam")).toBeVisible();
    expect(within(publicHolidays).queryByText("Friedensfest")).toBeNull();
    expect(screen.getByRole("link", { name: "OpenHolidays API" })).toHaveAttribute(
      "href",
      "https://www.openholidaysapi.org/de/",
    );
  });

  it("shows the holidays of a day in a tooltip", async () => {
    const { user } = await openApp({ data: STORED });

    await user.hover(screen.getByRole("gridcell", { name: /^Freitag, 25\. Dezember 2026, / }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Fr., 25.12.2026: Weihnachtsferien, Feiertag: 1. Weihnachtsfeiertag",
    );
  });

  it("marks the days of a holiday in the calendar while the mouse is on it in the list", async () => {
    const { user } = await openApp({ data: STORED });
    const allerheiligen = screen.getByRole("gridcell", {
      name: "Sonntag, 1. November 2026, Feiertag: Allerheiligen",
    });
    const autumn = screen.getByRole("gridcell", {
      name: "Montag, 2. November 2026, Herbstferien",
    });
    const publicHolidays = screen.getByRole("region", { name: "Feiertage" });
    expect(allerheiligen).not.toHaveClass("outline-foreground");

    await user.hover(within(publicHolidays).getByText("Allerheiligen"));
    expect(allerheiligen).toHaveClass("outline-foreground");
    expect(autumn).not.toHaveClass("outline-foreground");

    await user.unhover(within(publicHolidays).getByText("Allerheiligen"));
    expect(allerheiligen).not.toHaveClass("outline-foreground");
  });

  it("marks the whole holiday and its list entry while the mouse is on one of its days", async () => {
    const { user } = await openApp({ data: STORED });
    const monday = screen.getByRole("gridcell", { name: "Montag, 2. November 2026, Herbstferien" });
    const friday = screen.getByRole("gridcell", {
      name: "Freitag, 6. November 2026, Herbstferien",
    });
    const breaks = screen.getByRole("region", { name: "Ferien und freie Tage" });
    const autumnEntry = within(breaks).getAllByRole("listitem")[1]!;
    expect(autumnEntry).toHaveTextContent("Herbstferien");
    expect(autumnEntry).not.toHaveClass("bg-muted");

    await user.hover(monday);
    expect(friday).toHaveClass("outline-foreground");
    expect(autumnEntry).toHaveClass("bg-muted");

    await user.unhover(monday);
    expect(friday).not.toHaveClass("outline-foreground");
    expect(autumnEntry).not.toHaveClass("bg-muted");
  });

  it("shows today with a frame and the days before it pale", async () => {
    await openApp({ data: STORED });
    const today = screen.getByRole("gridcell", { name: "Dienstag, 10. November 2026" });
    expect(today).toHaveClass("ring-foreground!");
    expect(today).not.toHaveClass("opacity-40");
    expect(screen.getByRole("gridcell", { name: "Montag, 9. November 2026" })).toHaveClass(
      "opacity-40",
    );
    expect(screen.getByRole("gridcell", { name: "Mittwoch, 11. November 2026" })).not.toHaveClass(
      "opacity-40",
    );
    expect(
      within(screen.getByRole("list", { name: "Legende" })).getByText("Vorbei (blass)"),
    ).toBeVisible();
  });

  it("reads a stored school year without the internet and loads only new ones", async () => {
    const { user, urls, folder } = await openApp({
      data: STORED,
      rules: [...BAYERN_RULES, ...rulesFor("DE-HE")],
    });
    expect(screen.getByRole("heading", { name: "Bayern · Schuljahr 2026/27" })).toBeVisible();
    expect(urls).toHaveLength(0);

    await user.selectOptions(screen.getByLabelText("Schuljahr"), "2027/28");
    expect(
      await screen.findByRole("heading", { name: "Bayern · Schuljahr 2027/28" }),
    ).toBeVisible();
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("validFrom=2027-08-01");
    expect(screen.getByText("Erster Schultag: Di., 14.9.2027")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Schuljahr"), "2026/27 · gespeichert");
    expect(
      await screen.findByRole("heading", { name: "Bayern · Schuljahr 2026/27" }),
    ).toBeVisible();
    expect(urls).toHaveLength(2);

    await user.selectOptions(screen.getByLabelText("Bundesland"), "Hessen");
    expect(
      await screen.findByRole("heading", { name: "Hessen · Schuljahr 2026/27" }),
    ).toBeVisible();
    expect(urls[2]).toContain("subdivisionCode=DE-HE");

    await screen.findByText("Gespeichert");
    expect(savedData(folder).years).toHaveLength(3);
  });

  it("loads the shown school year again", async () => {
    const { user, urls, folder } = await openApp({ data: STORED });
    expect(screen.getByText("Geladen am Di., 10.11.2026")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Neu laden" }));

    await screen.findByText("Gespeichert");
    expect(urls).toHaveLength(2);
    expect(savedData(folder).years[0]?.fetchedAt).not.toBe(STORED.years[0]?.fetchedAt);
  });

  it("explains a failed load and keeps the shown school year", async () => {
    const { user } = await openApp({
      data: STORED,
      rules: [{ match: "SchoolHolidays", result: { kind: "ok", json: [] } }, BAYERN_RULES[1]],
    });

    await user.selectOptions(screen.getByLabelText("Schuljahr"), "2029/30");

    expect(
      await screen.findByText(
        "Für Bayern gibt es für das Schuljahr 2029/30 noch keine Ferientermine.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Bayern · Schuljahr 2026/27" })).toBeVisible();
    expect(screen.getByLabelText("Schuljahr")).toHaveValue("2026");
  });

  it("shows a message without internet at the first start", async () => {
    const { user } = await openApp({ rules: [{ match: "", result: { kind: "offline" } }] });

    await user.selectOptions(screen.getByLabelText("Bundesland"), "Berlin");
    await user.click(screen.getByRole("button", { name: "Ferien laden" }));

    expect(await screen.findByText(/Keine Verbindung zum Internet/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Schuljahr wählen" })).toBeVisible();
  });

  it("counts the days to the first school day in the holidays", async () => {
    await openApp({ data: STORED, today: "2026-12-28" });

    expect(screen.getByText("Weihnachtsferien", { selector: "p" })).toBeVisible();
    expect(screen.getByText("14 Tage")).toBeVisible();
    expect(screen.getByText("Erster Schultag: Mo., 11.1.2027")).toBeVisible();
  });

  it("names a public holiday", async () => {
    await openApp({ data: STORED, today: "2027-05-06" });
    expect(screen.getByText("Feiertag: Christi Himmelfahrt")).toBeVisible();
    expect(screen.getByText(/^Pfingstferien ab Di\., 18\.5\.2027\.$/)).toBeVisible();
  });

  it("names the weekend", async () => {
    await openApp({ data: STORED, today: "2026-11-14" });
    expect(screen.getByText("Wochenende")).toBeVisible();
  });

  it("says when the loaded holidays end before the next school day", async () => {
    const summer: SchoolYear = {
      ...bayern2026(),
      holidays: [
        { id: "s", kind: "school", name: "Sommerferien", start: "2027-07-20", end: "2027-09-13" },
      ],
    };
    await openApp({ data: { ...STORED, years: [summer] }, today: "2027-07-25" });

    expect(screen.getByText("Die Sommerferien gehen bis Mo., 13.9.2027.")).toBeVisible();
    expect(screen.getByText("–")).toBeVisible();
  });

  it("says when the school year is over", async () => {
    await openApp({ data: STORED, today: "2027-08-05" });

    expect(screen.getByText("Dieses Schuljahr ist vorbei.")).toBeVisible();
  });
});
