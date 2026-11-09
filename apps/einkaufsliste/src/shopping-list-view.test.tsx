import { createMemoryFileAccess } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";
import { DataFileProvider } from "./schema.ts";
import { ShoppingListView } from "./shopping-list-view.tsx";

const fileText = JSON.stringify({
  app: "einkaufsliste",
  schemaVersion: 1,
  savedWith: "0.1.0",
  savedAt: "2026-11-09T12:00:00.000Z",
  data: {
    items: [
      { id: "a", name: "Milch", done: false },
      { id: "b", name: "Brot", done: true },
    ],
  },
});

async function openList(text = fileText) {
  const fake = createMemoryFileAccess({ directSave: false });
  fake.nextOpen = { name: "liste.json", text, handle: null };
  const user = userEvent.setup();
  render(
    <DataFileProvider fileAccess={fake}>
      <ShoppingListView />
    </DataFileProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Datei öffnen" }));
  return user;
}

describe("App", () => {
  it("starts with the start screen", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Neue Datei" })).toBeInTheDocument();
  });
});

describe("ShoppingListView", () => {
  it("shows the items of the file", async () => {
    await openList();

    expect(screen.getByRole("checkbox", { name: "Milch" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Brot" })).toBeChecked();
  });

  it("adds an item", async () => {
    const user = await openList();

    await user.type(screen.getByLabelText("Neuer Eintrag"), "Eier");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(screen.getByRole("checkbox", { name: "Eier" })).toBeInTheDocument();
    expect(screen.getByLabelText("Neuer Eintrag")).toHaveValue("");
  });

  it("disables the add button for an empty name", async () => {
    await openList();

    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeDisabled();
  });

  it("toggles an item", async () => {
    const user = await openList();

    await user.click(screen.getByRole("checkbox", { name: "Milch" }));

    expect(screen.getByRole("checkbox", { name: "Milch" })).toBeChecked();
  });

  it("deletes an item", async () => {
    const user = await openList();

    await user.click(screen.getByRole("button", { name: "Milch löschen" }));

    expect(screen.queryByRole("checkbox", { name: "Milch" })).not.toBeInTheDocument();
  });

  it("removes all done items", async () => {
    const user = await openList();

    await user.click(screen.getByRole("button", { name: "Erledigte entfernen (1)" }));

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Erledigte entfernen/ })).not.toBeInTheDocument();
  });

  it("shows a hint for an empty list", async () => {
    const user = userEvent.setup();
    render(
      <DataFileProvider fileAccess={createMemoryFileAccess({ directSave: false })}>
        <ShoppingListView />
      </DataFileProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Neue Datei" }));

    expect(screen.getByText("Die Liste ist leer.")).toBeInTheDocument();
  });
});
