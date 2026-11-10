import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { CountdownData } from "./schema.ts";

const NOW = new Date(2026, 10, 10, 12, 0, 0);
const fixedClock = () => NOW;

const DATA: CountdownData = {
  events: [
    {
      id: "w",
      name: "Hochzeit",
      date: "2026-11-12",
      time: "15:04",
      createdAt: new Date(2026, 10, 1).toISOString(),
    },
    { id: "s", name: "Schuljahr", date: "2027-07-23", time: null, createdAt: NOW.toISOString() },
    {
      id: "u",
      name: "Urlaub",
      date: "2026-08-01",
      time: null,
      createdAt: new Date(2026, 0, 1).toISOString(),
    },
  ],
};

async function openApp(data?: CountdownData, clock = fixedClock) {
  const folder = createMemoryFolder();
  if (data) {
    folder.files.set("countdown.json", {
      text: JSON.stringify({
        app: "countdown",
        schemaVersion: 1,
        savedWith: "1.0",
        savedAt: NOW.toISOString(),
        data,
      }),
      lastModified: 1,
    });
  }
  const user = userEvent.setup();
  render(<App folderHost={createMemoryFolderHost({ saved: folder })} clock={clock} />);
  await screen.findByRole("heading", { name: "Deine Termine" });
  return { folder, user };
}

function savedData(folder: ReturnType<typeof createMemoryFolder>): CountdownData {
  return (JSON.parse(folder.files.get("countdown.json")?.text ?? "") as { data: CountdownData })
    .data;
}

describe("Countdown", () => {
  it("needs Chrome or Edge for the data folder", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeInTheDocument();
  });

  it("shows the coming events first and counts down", async () => {
    await openApp(DATA);

    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(["Hochzeit", "Schuljahr", "Urlaub"]);
    expect(screen.getAllByRole("timer")[0]).toHaveAccessibleName(
      "Noch 2 Tage, 3 Stunden, 4 Minuten, 0 Sekunden",
    );
    expect(screen.getByText("Donnerstag, 12. November 2026, 15:04 Uhr")).toBeInTheDocument();
    expect(screen.getByText("Insgesamt noch 51 Stunden.")).toBeInTheDocument();
    expect(screen.getByText("81 % der Wartezeit seit dem Eintragen geschafft")).toBeInTheDocument();

    const past = screen.getByRole("region", { name: "Vorbei" });
    expect(within(past).getByText(/Vorbei seit 101 Tagen und/)).toBeInTheDocument();
  });

  it("updates the countdown every second", async () => {
    let now = NOW;
    await openApp({ events: [DATA.events[0]!] }, () => now);
    expect(screen.getByRole("timer")).toHaveAccessibleName(/0 Sekunden$/);

    now = new Date(NOW.getTime() - 5000);

    expect(
      await screen.findByRole("timer", { name: /5 Sekunden$/ }, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it("starts with the end of the year and says so when the list is empty", async () => {
    const { user } = await openApp();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    expect(
      screen.getByRole("heading", { level: 3, name: /^Jahresende \d{4}$/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Jahresende \d{4} löschen$/ }));

    expect(screen.getByRole("heading", { name: "Noch keine Termine" })).toBeInTheDocument();
  });

  it("adds an event with and without a time and saves it", async () => {
    const { folder, user } = await openApp({ events: [] });

    await user.click(screen.getByRole("button", { name: "Neuer Termin" }));
    const dialog = screen.getByRole("dialog", { name: "Neuer Termin" });
    expect(within(dialog).getByRole("button", { name: "Speichern" })).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Name"), "Hochzeit");
    await user.type(within(dialog).getByLabelText("Datum"), "2027-06-12");
    await user.type(within(dialog).getByLabelText("Uhrzeit (optional)"), "14:30");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    await user.click(screen.getByRole("button", { name: "Neuer Termin" }));
    await user.type(screen.getByLabelText("Name"), "Ferien");
    await user.type(screen.getByLabelText("Datum"), "2027-07-23{Enter}");

    expect(
      screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(["Hochzeit", "Ferien"]);
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(savedData(folder).events).toMatchObject([
      { name: "Hochzeit", date: "2027-06-12", time: "14:30", createdAt: NOW.toISOString() },
      { name: "Ferien", date: "2027-07-23", time: null },
    ]);
  });

  it("changes an event and keeps the time when it was added", async () => {
    const { folder, user } = await openApp(DATA);

    await user.click(screen.getByRole("button", { name: "Hochzeit bearbeiten" }));
    const dialog = screen.getByRole("dialog", { name: "Termin bearbeiten" });
    expect(within(dialog).getByLabelText("Uhrzeit (optional)")).toHaveValue("15:04");
    await user.clear(within(dialog).getByLabelText("Uhrzeit (optional)"));
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    expect(screen.getByText("Donnerstag, 12. November 2026")).toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(savedData(folder).events[0]).toMatchObject({
      time: null,
      createdAt: DATA.events[0]?.createdAt,
    });

    await user.click(screen.getByRole("button", { name: "Urlaub bearbeiten" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an event without a time on its day as today, and a past event just after its moment", async () => {
    await openApp({
      events: [
        {
          id: "t",
          name: "Hochzeit",
          date: "2026-11-10",
          time: null,
          createdAt: new Date(2026, 0, 1).toISOString(),
        },
        {
          id: "p",
          name: "Termin",
          date: "2026-11-10",
          time: "11:59",
          createdAt: new Date(2026, 0, 1).toISOString(),
        },
      ],
    });

    expect(screen.getByText("Heute ist es so weit!")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Vorbei" })).getByText("Gerade eben vorbei."),
    ).toBeInTheDocument();
  });

  it("does not save a date that the app cannot use", async () => {
    const { user } = await openApp({ events: [] });

    await user.click(screen.getByRole("button", { name: "Neuer Termin" }));
    await user.type(screen.getByLabelText("Name"), "Fernes Ziel");
    expect(screen.getByLabelText("Datum")).toHaveAttribute("max", "9999-12-31");

    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
  });

  it("removes an event after a confirmation", async () => {
    const { user } = await openApp(DATA);
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);

    await user.click(screen.getByRole("button", { name: "Urlaub löschen" }));
    expect(screen.getByRole("region", { name: "Vorbei" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Urlaub löschen" }));
    expect(screen.queryByRole("region", { name: "Vorbei" })).not.toBeInTheDocument();
  });
});
