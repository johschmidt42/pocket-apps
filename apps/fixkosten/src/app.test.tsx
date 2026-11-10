import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { FixkostenData } from "./schema.ts";
import { testCost, testIncome, testProfile } from "./test-data.ts";

function fileText(data: FixkostenData): string {
  return JSON.stringify({
    app: "fixkosten",
    schemaVersion: 1,
    savedWith: "1.0",
    savedAt: "2026-11-10T12:00:00.000Z",
    data,
  });
}

const STARTER: FixkostenData = {
  profiles: [
    testProfile({
      id: "home",
      name: "Wohnung",
      incomes: [testIncome({ id: "salary", name: "Gehalt", amountCents: 300000 })],
      costs: [
        testCost({
          id: "rent",
          name: "Miete",
          amountCents: 100000,
          category: "housing",
          icon: "house",
        }),
        testCost({
          id: "tax",
          name: "Kfz-Steuer",
          amountCents: 12000,
          interval: "yearly",
          dueMonth: 4,
          category: "mobility",
          icon: "car",
        }),
      ],
    }),
    testProfile({ id: "parents", name: "Eltern" }),
  ],
  activeProfileId: "home",
};

/** Opens the app with a folder. `data` is the content of fixkosten.json, or nothing for a new file. */
async function openApp(data?: FixkostenData) {
  const folder = createMemoryFolder();
  if (data) folder.files.set("fixkosten.json", { text: fileText(data), lastModified: 1 });
  const user = userEvent.setup();
  render(<App folderHost={createMemoryFolderHost({ saved: folder })} />);
  await screen.findByLabelText("Profil");
  return { folder, user };
}

function savedData(folder: ReturnType<typeof createMemoryFolder>): FixkostenData {
  const text = folder.files.get("fixkosten.json")?.text ?? "";
  return (JSON.parse(text) as { data: FixkostenData }).data;
}

const plain = (text: string | null) => text?.replace(/\s/g, " ") ?? "";

describe("App", () => {
  it("needs Chrome or Edge for the data folder", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeInTheDocument();
  });

  it("starts empty and loads the example", async () => {
    const { folder, user } = await openApp();

    expect(screen.getByRole("heading", { name: "Noch keine Einträge" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Diagramme" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Beispiel laden" }));

    expect(screen.getByRole("heading", { name: "Diagramme" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Fixkosten" })).getAllByRole("listitem"),
    ).toHaveLength(12);
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(savedData(folder).profiles[0]?.costs).toHaveLength(12);
  });
});

describe("Numbers and charts", () => {
  // jsdom has no layout. Recharts measures its container, so give each element a size.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 640,
      bottom: 400,
      width: 640,
      height: 400,
      toJSON: () => ({}),
    });
  });

  it("shows the totals per month and per year", async () => {
    const { user } = await openApp(STARTER);

    expect(
      plain(screen.getByText("Fixkosten pro Monat").nextElementSibling?.textContent ?? null),
    ).toBe("1.010,00 €");
    expect(plain(screen.getByText("Übrig pro Monat").nextElementSibling?.textContent ?? null)).toBe(
      "1.990,00 €",
    );
    expect(screen.getByText("Fixkosten: 34 % davon")).toBeInTheDocument();
    expect(
      plain(screen.getByText("Rücklage pro Monat").nextElementSibling?.textContent ?? null),
    ).toBe("10,00 €");

    await user.click(screen.getByRole("radio", { name: "pro Jahr" }));

    expect(
      plain(screen.getByText("Fixkosten pro Jahr").nextElementSibling?.textContent ?? null),
    ).toBe("12.120,00 €");
  });

  it("shows a deficit when the costs are higher than the income", async () => {
    const data = structuredClone(STARTER);
    data.profiles[0]?.incomes.splice(0, 1, testIncome({ id: "salary", amountCents: 50000 }));
    await openApp(data);

    expect(
      plain(screen.getByText("Fehlbetrag pro Monat").nextElementSibling?.textContent ?? null),
    ).toBe("510,00 €");
    expect(screen.getByText("Fehlbetrag")).toBeInTheDocument();
  });

  it("shows the flow, the categories, the tiles and the months", async () => {
    const { user } = await openApp(STARTER);
    const panel = () => screen.getByRole("tabpanel");

    expect(within(panel()).getByText("Gehalt")).toBeInTheDocument();
    expect(within(panel()).getByText("Kfz-Steuer")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Einzelne Posten zeigen"));

    expect(within(panel()).queryByText("Kfz-Steuer")).not.toBeInTheDocument();
    expect(within(panel()).getByText("Mobilität")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Kategorien" }));

    expect(within(panel()).getByText("Wohnen")).toBeInTheDocument();
    expect(within(panel()).getByText(/99 %/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Kacheln" }));

    expect(within(panel()).getByRole("list", { name: "Legende" })).toHaveTextContent("Mobilität");

    await user.click(screen.getByRole("tab", { name: "Monate" }));

    expect(within(panel()).getByText(/Ø/)).toBeInTheDocument();
    expect(within(panel()).getByText("April:")).toBeInTheDocument();
    expect(within(panel()).getByText("(Kfz-Steuer)", { exact: false })).toBeInTheDocument();
  });

  it("says so when no cost has an amount", async () => {
    const { user } = await openApp({
      profiles: [
        testProfile({ id: "a", costs: [testCost({ id: "x", name: "Gratis", amountCents: 0 })] }),
      ],
      activeProfileId: "a",
    });

    expect(screen.getByText("Noch keine Posten mit einem Betrag.")).toBeInTheDocument();
    for (const tab of ["Kategorien", "Kacheln", "Monate"]) {
      await user.click(screen.getByRole("tab", { name: tab }));
      expect(screen.getByText("Noch keine Posten mit einem Betrag.")).toBeInTheDocument();
    }
  });
});

describe("Entries", () => {
  it("adds a cost and suggests the category and the icon from the name", async () => {
    const { folder, user } = await openApp(STARTER);

    await user.click(screen.getByRole("button", { name: "Posten" }));
    const dialog = screen.getByRole("dialog", { name: "Posten hinzufügen" });
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    expect(within(dialog).getByText("Bitte einen Namen eingeben.")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Bitte einen Betrag bis 10 Mio. € eingeben, z. B. 12,50."),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Name"), "Strom");
    expect(within(dialog).getByLabelText("Kategorie")).toHaveValue("energy");
    expect(within(dialog).getByRole("radio", { name: "Strom" })).toBeChecked();

    await user.type(within(dialog).getByLabelText("Betrag in Euro"), "240");
    await user.selectOptions(within(dialog).getByLabelText("Wie oft?"), "quarterly");
    await user.selectOptions(within(dialog).getByLabelText("Erste Zahlung im Jahr"), "2");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Energie & Wasser · vierteljährlich ab Februar")).toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(savedData(folder).profiles[0]?.costs.at(-1)).toMatchObject({
      name: "Strom",
      amountCents: 24000,
      interval: "quarterly",
      dueMonth: 2,
      category: "energy",
      icon: "zap",
    });
  });

  it("keeps the category and the icon that the user picked", async () => {
    const { user } = await openApp(STARTER);

    await user.click(screen.getByRole("button", { name: "Posten" }));
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("Kategorie"), "savings");
    expect(within(dialog).getByRole("radio", { name: "Sparen" })).toBeChecked();
    await user.click(within(dialog).getByRole("radio", { name: "Geldanlage" }));
    await user.type(within(dialog).getByLabelText("Name"), "Strom");

    expect(within(dialog).getByLabelText("Kategorie")).toHaveValue("savings");
    expect(within(dialog).getByRole("radio", { name: "Geldanlage" })).toBeChecked();
  });

  it("changes a cost", async () => {
    const { user } = await openApp(STARTER);

    await user.click(screen.getByRole("button", { name: "Kfz-Steuer bearbeiten" }));
    const dialog = screen.getByRole("dialog", { name: "Posten bearbeiten" });
    expect(within(dialog).getByLabelText("Betrag in Euro")).toHaveValue("120");
    expect(within(dialog).getByLabelText("Fällig im")).toHaveValue("4");
    await user.clear(within(dialog).getByLabelText("Betrag in Euro"));
    await user.type(within(dialog).getByLabelText("Betrag in Euro"), "130,5");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    const costs = screen.getByRole("list", { name: "Fixkosten" });
    expect(within(costs).getByText((text) => plain(text) === "130,50 €")).toBeInTheDocument();
  });

  it("adds and changes an income", async () => {
    const { user } = await openApp(STARTER);

    await user.click(screen.getByRole("button", { name: "Einkommen" }));
    let dialog = screen.getByRole("dialog", { name: "Einkommen hinzufügen" });
    expect(within(dialog).queryByLabelText("Kategorie")).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Name"), "Kindergeld");
    await user.type(within(dialog).getByLabelText("Betrag in Euro"), "255");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    await user.click(screen.getByRole("button", { name: "Kindergeld bearbeiten" }));
    dialog = screen.getByRole("dialog", { name: "Einkommen bearbeiten" });
    await user.clear(within(dialog).getByLabelText("Name"));
    await user.type(within(dialog).getByLabelText("Name"), "Kindergeld Anna");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));

    const incomes = screen.getByRole("list", { name: "Einkommen" });
    expect(within(incomes).getByText("Kindergeld Anna")).toBeInTheDocument();
  });

  it("closes the dialog without a change", async () => {
    const { user } = await openApp(STARTER);

    await user.click(screen.getByRole("button", { name: "Miete bearbeiten" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes entries after a confirmation and keeps the focus in the list", async () => {
    const { user } = await openApp(STARTER);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Miete löschen" }));
    expect(confirm).toHaveBeenCalledWith("„Miete“ löschen?");
    expect(screen.getByRole("button", { name: "Miete löschen" })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Miete löschen" }));
    expect(screen.queryByRole("button", { name: "Miete löschen" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kfz-Steuer löschen" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Gehalt löschen" }));
    expect(screen.getByText("Noch kein Einkommen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Einkommen" })).toHaveFocus();
  });
});

describe("Profiles", () => {
  it("switches, adds, renames and removes profiles", async () => {
    const { folder, user } = await openApp(STARTER);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.selectOptions(screen.getByLabelText("Profil"), "parents");
    expect(screen.getByRole("heading", { name: "Noch keine Einträge" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Neues Profil" }));
    let dialog = screen.getByRole("dialog", { name: "Neues Profil" });
    expect(within(dialog).getByRole("button", { name: "Speichern" })).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Name des Profils"), "Ferienhaus{Enter}");
    expect(screen.getByLabelText("Profil")).toHaveDisplayValue("Ferienhaus");

    await user.click(screen.getByRole("button", { name: "Profil umbenennen" }));
    dialog = screen.getByRole("dialog", { name: "Profil umbenennen" });
    await user.clear(within(dialog).getByLabelText("Name des Profils"));
    await user.type(within(dialog).getByLabelText("Name des Profils"), "Hütte");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(screen.getByLabelText("Profil")).toHaveDisplayValue("Hütte");

    await user.click(screen.getByRole("button", { name: "Profil löschen" }));
    expect(confirm).toHaveBeenCalledWith("Profil „Hütte“ mit allen Einträgen löschen?");
    expect(screen.getByLabelText("Profil")).toHaveDisplayValue("Wohnung");
    expect(screen.getByLabelText("Profil")).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Profil umbenennen" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(savedData(folder).profiles.map((profile) => profile.name)).toEqual([
      "Wohnung",
      "Eltern",
    ]);
  });

  it("keeps the profile when the user cancels and keeps the last profile", async () => {
    const { user } = await openApp({
      profiles: [testProfile({ id: "a", name: "Einzig" })],
      activeProfileId: "a",
    });

    expect(screen.getByRole("button", { name: "Profil löschen" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Neues Profil" }));
    await user.type(screen.getByLabelText("Name des Profils"), "Zwei{Enter}");
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Profil löschen" }));

    expect(screen.getByLabelText("Profil")).toHaveDisplayValue("Zwei");
  });
});
