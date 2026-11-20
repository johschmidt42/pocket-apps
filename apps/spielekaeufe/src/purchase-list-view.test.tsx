import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PurchaseListView } from "./purchase-list-view.tsx";
import { DataFileProvider, type Purchase } from "./schema.ts";

const FILE = "spielekaeufe/spielekaeufe.json";

function fileText(purchases: Purchase[]): string {
  return JSON.stringify({
    app: "spielekaeufe",
    schemaVersion: 1,
    savedWith: "1.0",
    savedAt: "2026-11-20T12:00:00.000Z",
    data: { purchases },
  });
}

const PURCHASES: Purchase[] = [
  { id: "h", date: "2024-03-01", name: "Hades", priceCents: 1249, appId: 1145360 },
  { id: "i", date: "2025-01-10", name: "INSIDE", priceCents: 399, appId: 304430 },
  { id: "f", date: "2023-07-15", name: "Fe", priceCents: 500, appId: null },
];

async function open(purchases: Purchase[] = PURCHASES) {
  const folder = createMemoryFolder();
  folder.files.set(FILE, { text: fileText(purchases), lastModified: 1 });
  const user = userEvent.setup();
  render(
    <DataFileProvider folderHost={createMemoryFolderHost({ saved: folder })}>
      <PurchaseListView />
    </DataFileProvider>,
  );
  await screen.findByRole("heading", { level: 2, name: "Deine Käufe" });
  return { user, folder };
}

function shownNames(): string[] {
  return within(screen.getByRole("list", { name: "Käufe" }))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

function savedPurchases(folder: ReturnType<typeof createMemoryFolder>): Purchase[] {
  const text = folder.files.get(FILE)?.text ?? "";
  return (JSON.parse(text) as { data: { purchases: Purchase[] } }).data.purchases;
}

describe("PurchaseListView", () => {
  it("shows the purchases, newest first, with the sum", async () => {
    await open();

    expect(shownNames()).toEqual(["INSIDE", "Hades", "Fe"]);
    expect(screen.getByText("3 Käufe ·", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("21,48 €")).toBeInTheDocument();
    expect(screen.getByText("10.01.2025")).toBeInTheDocument();
    expect(screen.getByText("3,99 €")).toBeInTheDocument();
  });

  it("sorts by price and by name", async () => {
    const { user } = await open();

    await user.selectOptions(screen.getByLabelText("Sortieren nach"), "Preis (teuerste zuerst)");
    expect(shownNames()).toEqual(["Hades", "Fe", "INSIDE"]);
    await user.selectOptions(screen.getByLabelText("Sortieren nach"), "Name (A–Z)");
    expect(shownNames()).toEqual(["Fe", "Hades", "INSIDE"]);
  });

  it("links the picture of Steam and shows a game pad without one", async () => {
    await open();
    const rows = within(screen.getByRole("list", { name: "Käufe" })).getAllByRole("listitem");

    // A picture with an empty alt text has the role "presentation": the name is next to it.
    const [first, , last] = rows.map((row) => within(row).queryByRole("presentation"));
    expect(first).toHaveAttribute(
      "src",
      "https://cdn.cloudflare.steamstatic.com/steam/apps/304430/header.jpg",
    );
    expect(first).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(last).toBeNull();
    // Without internet, the picture fails: the game pad shows. No user action: the browser
    // sends the event.
    act(() => {
      first?.dispatchEvent(new Event("error"));
    });
    expect(within(rows[0] ?? document.body).queryByRole("presentation")).toBeNull();
  });

  it("adds a purchase with a store link and saves it", async () => {
    const { user, folder } = await open();

    await user.click(screen.getByRole("button", { name: "Kauf" }));
    await user.type(screen.getByLabelText("Spiel"), "Frostpunk");
    const date = screen.getByLabelText("Datum");
    await user.clear(date);
    await user.type(date, "2026-11-01");
    await user.type(screen.getByLabelText("Preis in Euro"), "7,99");
    await user.type(
      screen.getByLabelText("Steam-Link oder AppID (optional)"),
      "https://store.steampowered.com/app/323190/Frostpunk/",
    );
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(shownNames()[0]).toBe("Frostpunk");
    await screen.findByText("Gespeichert");
    await vi.waitFor(() => {
      expect(savedPurchases(folder)).toContainEqual(
        expect.objectContaining({
          name: "Frostpunk",
          date: "2026-11-01",
          priceCents: 799,
          appId: 323190,
        }),
      );
    });
  });

  it("shows what is missing and does not save", async () => {
    const { user } = await open();

    await user.click(screen.getByRole("button", { name: "Kauf" }));
    await user.clear(screen.getByLabelText("Datum"));
    await user.type(screen.getByLabelText("Preis in Euro"), "viel");
    await user.type(screen.getByLabelText("Steam-Link oder AppID (optional)"), "Hades");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(screen.getByText("Gib den Namen des Spiels ein.")).toBeInTheDocument();
    expect(screen.getByText("Gib das Datum des Kaufs ein.")).toBeInTheDocument();
    expect(screen.getByText(/Gib den Preis in Euro ein/)).toBeInTheDocument();
    expect(screen.getByText(/Gib einen Link aus dem Steam-Shop/)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Neuer Kauf" })).toBeInTheDocument();
  });

  it("changes and removes a purchase", async () => {
    const { user, folder } = await open();

    await user.click(screen.getByRole("button", { name: "Hades bearbeiten" }));
    const dialog = screen.getByRole("dialog", { name: "Kauf bearbeiten" });
    expect(within(dialog).getByLabelText("Preis in Euro")).toHaveValue("12,49");
    expect(within(dialog).getByLabelText("Steam-Link oder AppID (optional)")).toHaveValue(
      "1145360",
    );
    const price = within(dialog).getByLabelText("Preis in Euro");
    await user.clear(price);
    await user.type(price, "10");
    await user.click(within(dialog).getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("10,00 €")).toBeInTheDocument();

    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Fe löschen" }));
    expect(shownNames()).toContain("Fe");
    await user.click(screen.getByRole("button", { name: "Fe löschen" }));
    expect(shownNames()).toEqual(["INSIDE", "Hades"]);
    await vi.waitFor(() => {
      expect(
        savedPurchases(folder)
          .map((purchase) => purchase.name)
          .sort(),
      ).toEqual(["Hades", "INSIDE"]);
    });
  });

  it("shows a short text without purchases, and the dialog closes with Escape", async () => {
    const { user } = await open([]);

    expect(screen.getByText(/Noch keine Käufe/)).toBeInTheDocument();
    expect(screen.getByText("0 Käufe ·", { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kauf" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
