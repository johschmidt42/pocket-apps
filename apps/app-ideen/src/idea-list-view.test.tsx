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
  folder.files.set("app-ideen/app-ideen.json", { text: fileText, lastModified: 1 });
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

  it("edits an idea in its place and focuses the edit button after save", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Rezepte bearbeiten" }));
    const form = screen.getByRole("form", { name: "Rezepte bearbeiten" });
    const title = within(form).getByLabelText("Titel");
    expect(title).toHaveFocus();
    expect(title).toHaveValue("Rezepte");

    await user.clear(title);
    await user.type(title, " Kochbuch ");
    await user.type(within(form).getByLabelText("Beschreibung"), "Wochenplan");
    await user.click(within(form).getByRole("button", { name: "Speichern" }));

    expect(ideaTitles()).toEqual(["Pflanzen", "Kochbuch", "Fahrtenbuch"]);
    expect(screen.getByText("Wochenplan")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: /bearbeiten/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kochbuch bearbeiten" })).toHaveFocus();
  });

  it("saves an edit with Enter in the title", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Rezepte bearbeiten" }));
    await user.keyboard(" vegan{Enter}");

    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte vegan", "Fahrtenbuch"]);
  });

  it("keeps the idea after a cancel with the button", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Pflanzen bearbeiten" }));
    await user.keyboard("{Control>}a{/Control}Bäume");
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte", "Fahrtenbuch"]);
    expect(screen.getByRole("button", { name: "Pflanzen bearbeiten" })).toHaveFocus();
  });

  it("keeps the idea after Escape in the description", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Pflanzen bearbeiten" }));
    await user.click(
      screen.getByLabelText("Beschreibung", { selector: "#idea-a-edit-description" }),
    );
    await user.keyboard("{Control>}a{/Control}Neu{Escape}");

    expect(screen.getByText("Gießplan für alle Pflanzen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pflanzen bearbeiten" })).toHaveFocus();
  });

  it("disables the other edit buttons while a form is open", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Pflanzen bearbeiten" }));

    expect(screen.getByRole("button", { name: "Rezepte bearbeiten" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fahrtenbuch bearbeiten" })).toBeDisabled();
  });

  it("disables save without a title", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Rezepte bearbeiten" }));
    await user.keyboard("{Control>}a{/Control}{Backspace}");

    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
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

  it("focuses the previous idea after the last idea is removed, then the list heading", async () => {
    const user = await openIdeas();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Fahrtenbuch löschen" }));
    expect(screen.getByRole("button", { name: "Rezepte löschen" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Rezepte löschen" }));
    await user.click(screen.getByRole("button", { name: "Pflanzen löschen" }));
    // Not the title input: on a phone, it would open the keyboard.
    expect(screen.getByRole("heading", { name: "Ideen (0)" })).toHaveFocus();
  });

  it("changes the order with the arrow keys on the grip and keeps the focus on it", async () => {
    const user = await openIdeas();
    const grip = () => screen.getByRole("button", { name: "Fahrtenbuch verschieben" });

    await user.click(grip());
    await user.keyboard("{ArrowUp}");
    expect(ideaTitles()).toEqual(["Pflanzen", "Fahrtenbuch", "Rezepte"]);
    expect(grip()).toHaveFocus();

    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(ideaTitles()).toEqual(["Fahrtenbuch", "Pflanzen", "Rezepte"]);

    await user.keyboard("{ArrowDown}");
    expect(ideaTitles()).toEqual(["Pflanzen", "Fahrtenbuch", "Rezepte"]);
    expect(grip()).toHaveAccessibleDescription(/Pfeiltaste/);
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
