import { createMemoryFileAccess } from "@pocket-apps/core/data-file/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";
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
    ],
  },
});

async function openIdeas() {
  const fake = createMemoryFileAccess({ directSave: false });
  fake.nextOpen = { name: "ideen.json", text: fileText, handle: null };
  const user = userEvent.setup();
  render(
    <DataFileProvider fileAccess={fake}>
      <IdeaListView />
    </DataFileProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Datei öffnen" }));
  return user;
}

function ideaTitles(): string[] {
  const list = screen.getByRole("list");
  return within(list)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

describe("App", () => {
  it("starts with the start screen", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Neue Datei" })).toBeInTheDocument();
  });
});

describe("IdeaListView", () => {
  it("shows the ideas of the file in order, with description", async () => {
    await openIdeas();

    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte"]);
    expect(screen.getByText("Gießplan für alle Pflanzen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ideen (2)" })).toBeInTheDocument();
  });

  it("adds an idea with title and description", async () => {
    const user = await openIdeas();

    await user.type(screen.getByLabelText("Titel"), "Wetter");
    await user.type(screen.getByLabelText("Beschreibung"), "Regenradar für morgen");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte", "Wetter"]);
    expect(screen.getByText("Regenradar für morgen")).toBeInTheDocument();
    expect(screen.getByLabelText("Titel")).toHaveValue("");
    expect(screen.getByLabelText("Beschreibung")).toHaveValue("");
  });

  it("disables the add button without a title", async () => {
    await openIdeas();

    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeDisabled();
  });

  it("removes an idea", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Pflanzen löschen" }));

    expect(ideaTitles()).toEqual(["Rezepte"]);
  });

  it("changes the order with the arrow buttons", async () => {
    const user = await openIdeas();

    await user.click(screen.getByRole("button", { name: "Rezepte nach oben" }));
    expect(ideaTitles()).toEqual(["Rezepte", "Pflanzen"]);

    await user.click(screen.getByRole("button", { name: "Rezepte nach unten" }));
    expect(ideaTitles()).toEqual(["Pflanzen", "Rezepte"]);
  });

  it("disables 'up' for the first and 'down' for the last idea", async () => {
    await openIdeas();

    expect(screen.getByRole("button", { name: "Pflanzen nach oben" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rezepte nach unten" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pflanzen nach unten" })).toBeEnabled();
  });

  it("shows a hint when there are no ideas", async () => {
    const user = userEvent.setup();
    render(
      <DataFileProvider fileAccess={createMemoryFileAccess({ directSave: false })}>
        <IdeaListView />
      </DataFileProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Neue Datei" }));

    expect(screen.getByText("Noch keine Ideen.")).toBeInTheDocument();
  });
});
