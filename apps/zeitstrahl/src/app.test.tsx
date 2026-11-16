import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { ZeitstrahlData } from "./schema.ts";
import { testEntry } from "./test-data.ts";

const TODAY = "2026-11-14";

const DATA: ZeitstrahlData = {
  activeTimelineId: "cv",
  timelines: [
    {
      id: "cv",
      name: "Lebenslauf",
      scale: "real",
      trunk: "gray",
      entries: [
        testEntry("birth", { kind: "point", date: "1995-04-12" }, { title: "Geburt" }),
        testEntry(
          "study",
          { kind: "range", start: "2013-10", end: "2018-09" },
          { title: "Studium", description: "Informatik in Köln" },
        ),
        testEntry("job", { kind: "ongoing", start: "2018-11" }, { title: "Job" }),
      ],
    },
    { id: "doc", name: "Arzttermine", scale: "real", trunk: "gray", entries: [] },
  ],
};

async function openApp(data?: ZeitstrahlData) {
  const folder = createMemoryFolder();
  if (data) {
    folder.files.set("zeitstrahl.json", {
      text: JSON.stringify({
        app: "zeitstrahl",
        schemaVersion: 1,
        savedWith: "1.0",
        savedAt: "2026-11-14T10:00:00.000Z",
        data,
      }),
      lastModified: 1,
    });
  }
  const user = userEvent.setup();
  render(<App folderHost={createMemoryFolderHost({ saved: folder })} today={TODAY} />);
  await screen.findByRole("button", { name: "Neuer Eintrag" });
  return { folder, user };
}

function savedData(folder: ReturnType<typeof createMemoryFolder>): ZeitstrahlData {
  return (JSON.parse(folder.files.get("zeitstrahl.json")?.text ?? "") as { data: ZeitstrahlData })
    .data;
}

/** The label of an entry in the timeline picture. */
function chartLabel(title: string) {
  return screen.getByRole("button", { name: new RegExp(`^${title}`) });
}

describe("Zeitstrahl", () => {
  it("needs Chrome or Edge for the data folder", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeInTheDocument();
  });

  it("shows an example until the first entry", async () => {
    const { folder, user } = await openApp();

    expect(screen.getByRole("heading", { level: 2, name: "Mein Zeitstrahl" })).toBeVisible();
    expect(screen.getByText(/So kann ein Lebenslauf aussehen/)).toBeVisible();
    expect(screen.getByText("10/2013 – 09/2018 · 5 Jahre")).toBeVisible();
    expect(screen.getByText("Heute")).toBeInTheDocument();
    // The example cards cannot be opened or hidden, but they show their description.
    expect(screen.queryByRole("button", { name: /^Studium/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ausblenden/ })).not.toBeInTheDocument();
    await user.hover(screen.getByText("Studium"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Bachelor und Master");
    await user.unhover(screen.getByText("Studium"));

    await user.click(screen.getByRole("button", { name: "Neuer Eintrag" }));
    await user.type(screen.getByLabelText("Bezeichnung"), "Zahnarzt");
    await user.selectOptions(screen.getByLabelText("Genauigkeit"), "month");
    await user.type(screen.getByLabelText("Datum"), "2026-12");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(chartLabel("Zahnarzt")).toHaveTextContent("12/2026");
    expect(screen.queryByText(/So kann ein Lebenslauf aussehen/)).not.toBeInTheDocument();
    expect(screen.queryByText("Studium")).not.toBeInTheDocument();
    await vi.waitFor(() => {
      expect(savedData(folder).timelines[0]?.entries.map((entry) => entry.title)).toEqual([
        "Zahnarzt",
      ]);
    });
  });

  it("shows the description when the mouse is on an entry", async () => {
    const { user } = await openApp(DATA);

    expect(chartLabel("Studium")).toHaveTextContent("(mit Beschreibung)");
    expect(chartLabel("Geburt")).not.toHaveTextContent("(mit Beschreibung)");
    await user.hover(chartLabel("Studium"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Informatik in Köln");
  });

  it("shows the dates of the active entry on the trunk", async () => {
    const { user } = await openApp(DATA);

    expect(screen.queryByText("10/2013")).not.toBeInTheDocument();
    await user.hover(chartLabel("Studium"));

    expect(screen.getByText("10/2013")).toBeInTheDocument();
    expect(screen.getByText("09/2018")).toBeInTheDocument();
    await user.hover(chartLabel("Geburt"));
    expect(screen.queryByText("10/2013")).not.toBeInTheDocument();
    // A point: its date is on the card and on the trunk.
    expect(screen.getAllByText("12.04.1995")).toHaveLength(2);
  });

  it("shows lists and bold text in the description", async () => {
    const data: ZeitstrahlData = {
      ...DATA,
      timelines: [
        {
          id: "cv",
          name: "Lebenslauf",
          scale: "real",
          trunk: "gray",
          entries: [
            testEntry(
              "job",
              { kind: "range", start: "2021-03", end: "2024-01" },
              { title: "Job", description: "**Datamesh** GmbH\nKöln\n· AI hub\n- Computer vision" },
            ),
          ],
        },
      ],
    };
    const { user } = await openApp(data);

    await user.hover(chartLabel("Job"));

    const tooltip = await screen.findByRole("tooltip");
    expect(within(tooltip).getByText("Datamesh").tagName).toBe("STRONG");
    // A single line break stays a line break in the paragraph.
    expect(within(tooltip).getByText(/Köln/)).toBeInTheDocument();
    expect(
      within(tooltip)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["AI hub", "Computer vision"]);
  });

  it("closes the description on Escape, on a scroll and when the mouse leaves the page", async () => {
    const { user } = await openApp(DATA);

    await user.hover(chartLabel("Studium"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Informatik in Köln");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // userEvent cannot scroll or leave the page. Thus the test sends these browser events itself.
    await user.hover(chartLabel("Job"));
    await user.hover(chartLabel("Studium"));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    // At the end of the scroll, the card under the resting mouse shows its description. jsdom has
    // no layout: this replaces the browser API.
    document.elementFromPoint = () => chartLabel("Studium");
    act(() => {
      window.dispatchEvent(new Event("scrollend"));
    });
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Informatik in Köln");
    Reflect.deleteProperty(document, "elementFromPoint");

    act(() => {
      document.documentElement.dispatchEvent(new Event("pointerleave"));
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    // Without a mouse on the page, the end of a scroll changes nothing.
    act(() => {
      window.dispatchEvent(new Event("scrollend"));
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the description of a card with the keyboard focus", async () => {
    const { user } = await openApp(DATA);

    act(() => {
      chartLabel("Studium").focus();
    });
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Informatik in Köln");
    // The eye button is in the same card: the description stays.
    await user.tab();
    expect(screen.getByRole("button", { name: "„Studium“ ausblenden" })).toHaveFocus();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    // The next card has no description.
    await user.tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("adds a point, a range and an ongoing range", async () => {
    const { folder, user } = await openApp(DATA);

    await user.click(screen.getByRole("button", { name: "Neuer Eintrag" }));
    // The newest entry has a month. Thus the new entry starts with months too.
    expect(screen.getByLabelText("Genauigkeit")).toHaveValue("month");
    await user.selectOptions(screen.getByLabelText("Genauigkeit"), "day");
    await user.type(screen.getByLabelText("Bezeichnung"), "Umzug");
    await user.type(screen.getByLabelText("Datum"), "2018-10-01");
    await user.type(screen.getByLabelText("Beschreibung (optional)"), "Nach Berlin");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(chartLabel("Umzug")).toHaveTextContent("01.10.2018");

    await user.click(screen.getByRole("button", { name: "Neuer Eintrag" }));
    await user.type(screen.getByLabelText("Bezeichnung"), "Schule");
    await user.click(screen.getByRole("radio", { name: "Zeitraum" }));
    await user.selectOptions(screen.getByLabelText("Genauigkeit"), "year");
    await user.type(screen.getByLabelText("Von"), "2001");
    await user.type(screen.getByLabelText("Bis"), "2013");
    await user.selectOptions(screen.getByLabelText("Seite"), "right");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await user.click(screen.getByRole("button", { name: "Neuer Eintrag" }));
    await user.type(screen.getByLabelText("Bezeichnung"), "Verein");
    await user.click(screen.getByRole("radio", { name: "Bis heute" }));
    expect(screen.getByText(/geht bis heute/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Seit"), "2020");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(chartLabel("Verein")).toHaveTextContent("seit 2020");
    await screen.findByText("Gespeichert");
    await vi.waitFor(() => {
      expect(savedData(folder).timelines[0]?.entries.slice(3)).toMatchObject([
        {
          title: "Umzug",
          description: "Nach Berlin",
          when: { kind: "point", date: "2018-10-01" },
          side: "auto",
          visible: true,
        },
        { title: "Schule", when: { kind: "range", start: "2001", end: "2013" }, side: "right" },
        { title: "Verein", when: { kind: "ongoing", start: "2020" } },
      ]);
    });
  });

  it("checks the fields before it saves", async () => {
    const { user } = await openApp(DATA);

    await user.click(screen.getByRole("button", { name: "Neuer Eintrag" }));
    await user.click(screen.getByRole("radio", { name: "Zeitraum" }));
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(screen.getByText("Bitte eine Bezeichnung eingeben.")).toBeVisible();
    expect(screen.getAllByText("Bitte ein Datum eingeben.")).toHaveLength(2);
    expect(screen.getByLabelText("Bezeichnung")).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText("Bezeichnung"), "Studium");
    await user.type(screen.getByLabelText("Von"), "2018-09");
    await user.type(screen.getByLabelText("Bis"), "2013-10");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(screen.getByText("Das Ende liegt vor dem Anfang.")).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("converts the dates when the precision changes", async () => {
    const { user } = await openApp(DATA);

    await user.click(chartLabel("Studium"));
    expect(screen.getByLabelText("Von")).toHaveValue("2013-10");
    await user.selectOptions(screen.getByLabelText("Genauigkeit"), "year");
    expect(screen.getByLabelText("Von")).toHaveValue(2013);
    expect(screen.getByLabelText("Bis")).toHaveValue(2018);
    await user.selectOptions(screen.getByLabelText("Genauigkeit"), "day");
    expect(screen.getByLabelText("Von")).toHaveValue("2013-01-01");
  });

  it("opens an entry with a click on its label and saves the change", async () => {
    const { folder, user } = await openApp(DATA);

    await user.click(chartLabel("Studium"));
    expect(screen.getByRole("heading", { name: "Eintrag bearbeiten" })).toBeVisible();
    expect(screen.getByLabelText("Beschreibung (optional)")).toHaveValue("Informatik in Köln");
    await user.clear(screen.getByLabelText("Bezeichnung"));
    await user.type(screen.getByLabelText("Bezeichnung"), "Master");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(chartLabel("Master")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(savedData(folder).timelines[0]?.entries[1]).toMatchObject({
        id: "study",
        title: "Master",
      });
    });
  });

  it("hides and shows entries with the eye button on the card", async () => {
    const { folder, user } = await openApp(DATA);

    await user.click(screen.getByRole("button", { name: "„Geburt“ ausblenden" }));

    expect(screen.queryByRole("button", { name: /^Geburt/ })).not.toBeInTheDocument();
    await vi.waitFor(() => {
      expect(savedData(folder).timelines[0]?.entries[0]?.visible).toBe(false);
    });

    // The hidden entry comes back as a faded card. Its eye button shows it again.
    const showHidden = screen.getByRole("button", { name: "Ausgeblendete zeigen (1)" });
    await user.click(showHidden);
    expect(showHidden).toHaveAttribute("aria-pressed", "true");
    expect(chartLabel("Geburt")).toHaveAccessibleName(/\(ausgeblendet\)/);
    await user.click(screen.getByRole("button", { name: "„Geburt“ einblenden" }));

    expect(chartLabel("Geburt")).not.toHaveAccessibleName(/\(ausgeblendet\)/);
    expect(screen.queryByRole("button", { name: /^Ausgeblendete zeigen/ })).not.toBeInTheDocument();
    // The next hidden entry disappears at once.
    await user.click(screen.getByRole("button", { name: "„Job“ ausblenden" }));
    expect(screen.queryByRole("button", { name: /^Job/ })).not.toBeInTheDocument();
  });

  it("tells how to show the entries when all are hidden", async () => {
    const { user } = await openApp(DATA);

    for (const title of ["Geburt", "Studium", "Job"]) {
      await user.click(screen.getByRole("button", { name: `„${title}“ ausblenden` }));
    }

    expect(screen.getByText(/Alle Einträge sind ausgeblendet/)).toBeVisible();
    expect(screen.queryByText("Heute")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ausgeblendete zeigen (3)" }));
    expect(chartLabel("Studium")).toBeInTheDocument();
  });

  it("deletes an entry after a question", async () => {
    const { user } = await openApp(DATA);
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await user.click(chartLabel("Job"));
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    // No: the dialog stays open.
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Löschen" }));

    expect(confirm).toHaveBeenLastCalledWith("„Job“ löschen?");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Job/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "„Job“ ausblenden" })).not.toBeInTheDocument();
  });

  it("gives the trunk the next color on a click", async () => {
    const { folder, user } = await openApp(DATA);

    await user.click(screen.getByRole("button", { name: "Farbe des Stamms ändern, jetzt Grau" }));
    await user.click(screen.getByRole("button", { name: "Farbe des Stamms ändern, jetzt Grün" }));

    expect(
      screen.getByRole("button", { name: "Farbe des Stamms ändern, jetzt Lila" }),
    ).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(savedData(folder).timelines[0]?.trunk).toBe("purple");
    });
  });

  it("cuts long gaps when the user selects it", async () => {
    const { folder, user } = await openApp(DATA);

    expect(screen.queryByText("18 Jahre")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Lücken kürzen" }));

    expect(screen.getByText("18 Jahre")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(savedData(folder).timelines[0]?.scale).toBe("compact");
    });
  });

  it("adds, selects, renames and deletes timelines", async () => {
    const { folder, user } = await openApp(DATA);

    await user.click(screen.getByRole("radio", { name: "Arzttermine" }));
    // A click on the active timeline keeps it.
    await user.click(screen.getByRole("radio", { name: "Arzttermine" }));
    expect(screen.getByRole("heading", { level: 2, name: "Arzttermine" })).toBeVisible();
    expect(screen.getByText(/Noch keine Einträge/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Neuer Zeitstrahl" }));
    await user.type(screen.getByLabelText("Name des Zeitstrahls"), "Urlaube");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByRole("heading", { level: 2, name: "Urlaube" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Zeitstrahl umbenennen" }));
    expect(screen.getByLabelText("Name des Zeitstrahls")).toHaveValue("Urlaube");
    await user.clear(screen.getByLabelText("Name des Zeitstrahls"));
    await user.type(screen.getByLabelText("Name des Zeitstrahls"), "Reisen");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByRole("heading", { level: 2, name: "Reisen" })).toBeVisible();

    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Zeitstrahl löschen" }));
    expect(screen.getByRole("heading", { level: 2, name: "Reisen" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Zeitstrahl löschen" }));
    expect(confirm).toHaveBeenLastCalledWith("Zeitstrahl „Reisen“ mit allen Einträgen löschen?");
    expect(screen.getByRole("heading", { level: 2, name: "Lebenslauf" })).toBeVisible();

    await vi.waitFor(() => {
      expect(savedData(folder).timelines.map((timeline) => timeline.name)).toEqual([
        "Lebenslauf",
        "Arzttermine",
      ]);
    });
  });

  it("closes the dialogs without a change", async () => {
    const { user } = await openApp(DATA);

    await user.click(screen.getByRole("button", { name: "Neuer Eintrag" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Neuer Zeitstrahl" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts labels on both sides of the line in a wide window", async () => {
    await openApp(DATA);

    // The leaf shape of a card left of the trunk is the mirror of a card right of the trunk.
    expect(chartLabel("Geburt")).toHaveClass("rounded-[0.375rem_1.25rem]");
    expect(chartLabel("Studium")).toHaveClass("rounded-[1.25rem_0.375rem]");
    expect(chartLabel("Job")).toHaveClass("rounded-[0.375rem_1.25rem]");
  });

  it("puts all labels right of the line in a narrow window", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 600,
      width: 320,
      height: 600,
      toJSON: () => ({}),
    });
    await openApp(DATA);

    // One column: all cards are right of the line.
    for (const title of ["Geburt", "Studium", "Job"]) {
      expect(chartLabel(title)).toHaveClass("rounded-[1.25rem_0.375rem]");
    }
  });
});
