import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { testAppInfo } from "@pocket-apps/core/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./app.tsx";

const apps = [
  testAppInfo({ name: "zinsrechner", title: "Zinsrechner", version: "1.2", stateful: false }),
  testAppInfo({ name: "app-ideen", title: "App-Ideen", stateful: true, network: true }),
];

describe("Launcher", () => {
  it("shows a card with a link for every app", () => {
    render(<App apps={apps} />);

    expect(screen.getByRole("link", { name: "Zinsrechner" })).toHaveAttribute(
      "href",
      "./zinsrechner.html",
    );
    expect(screen.getByRole("link", { name: "App-Ideen" })).toHaveAttribute(
      "href",
      "./app-ideen.html",
    );
    const zins = screen.getByRole("link", { name: "Zinsrechner" });
    expect(zins).toHaveTextContent("Version 1.2");
    expect(within(zins).getByRole("img", { name: "Speichert keine Daten" })).toBeInTheDocument();
    expect(
      within(zins).getByRole("img", { name: "Nutzt keine Online-Dienste" }),
    ).toBeInTheDocument();
    const liste = screen.getByRole("link", { name: "App-Ideen" });
    expect(
      within(liste).getByRole("img", { name: "Speichert Daten in einer eigenen Datei" }),
    ).toBeInTheDocument();
    expect(within(liste).getByRole("img", { name: "Nutzt Online-Dienste" })).toBeInTheDocument();
  });

  it("filters the apps by the search text", async () => {
    const user = userEvent.setup();
    render(<App apps={apps} />);

    await user.type(screen.getByLabelText("Apps durchsuchen"), "ideen");

    expect(screen.getByRole("link", { name: "App-Ideen" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Zinsrechner" })).not.toBeInTheDocument();
  });

  it("says so when no app matches", async () => {
    const user = userEvent.setup();
    render(<App apps={apps} />);

    await user.type(screen.getByLabelText("Apps durchsuchen"), "xyz");

    expect(screen.getByText("Keine App passt zu „xyz“.")).toBeInTheDocument();
  });

  it("uses the app list from the build by default", () => {
    render(<App />);

    // The test config sets __POCKET_APPS__ to one app: "Test-App".
    expect(screen.getAllByRole("link", { name: "Test-App" })).toHaveLength(1);
  });

  it("shows a notice in browsers without folder access", () => {
    render(<App apps={apps} />);

    // jsdom has no File System Access API.
    expect(screen.getByText(/funktionieren nur in Chrome und Edge/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reihenfolge ändern" })).not.toBeInTheDocument();
  });

  it("asks for the data folder above the apps on the first visit", async () => {
    const host = createMemoryFolderHost();
    host.nextPick = createMemoryFolder();
    const user = userEvent.setup();
    render(<App apps={apps} folderHost={host} />);

    expect(await screen.findByRole("region", { name: "Datenordner wählen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zinsrechner" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ordner wählen …" }));

    expect(await screen.findByRole("button", { name: "Reihenfolge ändern" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Datenordner wählen" })).not.toBeInTheDocument();
  });
});

describe("Launcher with a data folder", () => {
  function linkNames(): string[] {
    return within(screen.getByRole("list"))
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label") ?? "");
  }

  it("shows the apps in the saved order", async () => {
    const folder = createMemoryFolder();
    folder.files.set("launcher.json", {
      text: JSON.stringify({
        app: "launcher",
        schemaVersion: 1,
        savedWith: "2.0",
        savedAt: "2026-11-10T12:00:00.000Z",
        data: { order: ["app-ideen"] },
      }),
      lastModified: 1,
    });
    render(<App apps={apps} folderHost={createMemoryFolderHost({ saved: folder })} />);

    await screen.findByRole("button", { name: "Reihenfolge ändern" });

    expect(linkNames()).toEqual(["App-Ideen", "Zinsrechner"]);
  });

  it("changes the order and saves it in launcher.json", async () => {
    const folder = createMemoryFolder();
    const user = userEvent.setup();
    render(<App apps={apps} folderHost={createMemoryFolderHost({ saved: folder })} />);
    await user.type(await screen.findByLabelText("Apps durchsuchen"), "zins");

    await user.click(screen.getByRole("button", { name: "Reihenfolge ändern" }));

    expect(screen.getByRole("button", { name: "Fertig" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Zinsrechner nach oben" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Zinsrechner nach unten" }));

    expect(screen.getByRole("button", { name: "Zinsrechner nach oben" })).toHaveFocus();
    expect(
      within(screen.getByRole("list"))
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["App-Ideen", "Zinsrechner"]);

    await user.click(screen.getByRole("button", { name: "Fertig" }));

    expect(screen.getByRole("button", { name: "Reihenfolge ändern" })).toHaveFocus();
    expect(screen.getByLabelText("Apps durchsuchen")).toHaveValue("");
    expect(linkNames()).toEqual(["App-Ideen", "Zinsrechner"]);
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(JSON.parse(folder.files.get("launcher.json")?.text ?? "")).toMatchObject({
      data: { order: ["app-ideen", "zinsrechner"] },
    });
  });
});
