import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IdeaListView } from "./idea-list-view.tsx";
import { DataFileProvider } from "./schema.ts";

const fileText = JSON.stringify({
  app: "app-ideen",
  schemaVersion: 1,
  savedWith: "1.0",
  savedAt: "2026-11-09T12:00:00.000Z",
  data: {
    ideas: [
      { id: "a", title: "Pflanzen", description: "Gießplan für alle Pflanzen" },
      { id: "b", title: "Rezepte", description: "" },
      { id: "c", title: "Fahrtenbuch", description: "" },
    ],
  },
});

async function openIdeas() {
  const folder = createMemoryFolder();
  folder.files.set("app-ideen.json", { text: fileText, lastModified: 1 });
  const user = userEvent.setup();
  render(
    <DataFileProvider folderHost={createMemoryFolderHost({ saved: folder })}>
      <IdeaListView />
    </DataFileProvider>,
  );
  await screen.findByRole("list");
  return user;
}

function ideaTitles(): string[] {
  const list = screen.getByRole("list");
  return within(list)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

describe("IdeaListView", () => {
  it("shows the ideas of the file in order, with description", async () => {
    await openIdeas();

    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte", "Fahrtenbuch"]);
    expect(screen.getByText("Gießplan für alle Pflanzen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ideen (3)" })).toBeInTheDocument();
  });

  it("adds an idea with title and description", async () => {
    const user = await openIdeas();

    await user.type(screen.getByLabelText("Titel"), "Wetter");
    await user.type(screen.getByLabelText("Beschreibung"), "Regenradar für morgen");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte", "Fahrtenbuch", "Wetter"]);
    expect(screen.getByText("Regenradar für morgen")).toBeInTheDocument();
    expect(screen.getByLabelText("Titel")).toHaveValue("");
    expect(screen.getByLabelText("Beschreibung")).toHaveValue("");
  });

  it("disables the add button without a title", async () => {
    await openIdeas();

    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeDisabled();
  });

  it("removes an idea after a confirmation and focuses the next idea", async () => {
    const user = await openIdeas();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Pflanzen löschen" }));

    expect(confirm).toHaveBeenCalledWith("Idee „Pflanzen“ löschen?");
    expect(ideaTitles()).toEqual(["Rezepte", "Fahrtenbuch"]);
    expect(screen.getByRole("button", { name: "Rezepte löschen" })).toHaveFocus();
  });

  it("keeps the idea when the user cancels the confirmation", async () => {
    const user = await openIdeas();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Pflanzen löschen" }));

    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte", "Fahrtenbuch"]);
  });

  it("focuses the previous idea after the last idea is removed, then the title input", async () => {
    const user = await openIdeas();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Fahrtenbuch löschen" }));
    expect(screen.getByRole("button", { name: "Rezepte löschen" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Rezepte löschen" }));
    await user.click(screen.getByRole("button", { name: "Pflanzen löschen" }));
    expect(screen.getByLabelText("Titel")).toHaveFocus();
  });

  it("changes the order with the arrow buttons and keeps the focus on the moved idea", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Fahrtenbuch nach oben" }));
    expect(ideaTitles()).toEqual(["Pflanzen", "Fahrtenbuch", "Rezepte"]);
    expect(screen.getByRole("button", { name: "Fahrtenbuch nach oben" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Fahrtenbuch nach unten" }));
    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte", "Fahrtenbuch"]);
    expect(screen.getByRole("button", { name: "Fahrtenbuch nach unten" })).toBeDisabled();
  });

  it("moves the focus to the other arrow when an idea reaches the start or the end", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Rezepte nach oben" }));
    expect(ideaTitles()).toEqual(["Rezepte", "Pflanzen", "Fahrtenbuch"]);
    expect(screen.getByRole("button", { name: "Rezepte nach unten" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Pflanzen nach unten" }));
    expect(ideaTitles()).toEqual(["Rezepte", "Fahrtenbuch", "Pflanzen"]);
    expect(screen.getByRole("button", { name: "Pflanzen nach oben" })).toHaveFocus();
  });

  it("disables 'up' for the first and 'down' for the last idea", async () => {
    await openIdeas();

    expect(screen.getByRole("button", { name: "Pflanzen nach oben" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fahrtenbuch nach unten" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pflanzen nach unten" })).toBeEnabled();
  });

  it("shows a hint when there are no ideas", async () => {
    render(
      <DataFileProvider folderHost={createMemoryFolderHost({ saved: createMemoryFolder() })}>
        <IdeaListView />
      </DataFileProvider>,
    );

    expect(await screen.findByText("Noch keine Ideen.")).toBeInTheDocument();
  });
});
