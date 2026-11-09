import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DataFolderGate } from "./data-folder-gate.tsx";
import type { FolderHost } from "./folder.ts";
import { createMemoryFolder, createMemoryFolderHost } from "./testing.ts";

function setup(host: FolderHost) {
  const user = userEvent.setup();
  const view = render(
    <DataFolderGate host={host}>{(folder) => <p>Ordner: {folder.name}</p>}</DataFolderGate>,
  );
  return { user, view };
}

describe("DataFolderGate", () => {
  it("asks for Chrome or Edge when the browser cannot open a folder", () => {
    setup(createMemoryFolderHost({ supported: false }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeInTheDocument();
  });

  it("shows the app at once when the remembered folder has access", async () => {
    setup(createMemoryFolderHost({ saved: createMemoryFolder("Daten") }));

    expect(screen.getByRole("status")).toHaveTextContent("Lädt …");
    expect(await screen.findByText("Ordner: Daten")).toBeInTheDocument();
  });

  it("lets the person pick a folder on the first visit", async () => {
    const host = createMemoryFolderHost();
    const { user } = setup(host);
    const pickButton = await screen.findByRole("button", { name: "Ordner wählen …" });

    // The person cancels the dialog.
    await user.click(pickButton);

    expect(screen.getByRole("heading", { level: 2, name: "Datenordner wählen" })).toBeVisible();

    host.nextPick = createMemoryFolder("Daten");
    await user.click(pickButton);

    expect(await screen.findByText("Ordner: Daten")).toBeInTheDocument();
    expect(host.saved?.name).toBe("Daten");
  });

  it("shows an error when the folder dialog fails", async () => {
    const host = createMemoryFolderHost();
    host.pick = () => Promise.reject(new Error("SecurityError"));
    const { user } = setup(host);

    await user.click(await screen.findByRole("button", { name: "Ordner wählen …" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Der Datenordner ist nicht verfügbar: SecurityError",
    );
  });

  it("shows an error when the remembered folder cannot be loaded", async () => {
    const host = createMemoryFolderHost();
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- This test needs a non-Error rejection.
    host.loadSaved = () => Promise.reject("no IndexedDB");
    setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Der Datenordner ist nicht verfügbar: no IndexedDB",
    );
    expect(screen.getByRole("button", { name: "Ordner wählen …" })).toBeInTheDocument();
  });

  it("asks for access to the remembered folder", async () => {
    const folder = createMemoryFolder("Daten");
    folder.access = "prompt";
    const { user } = setup(createMemoryFolderHost({ saved: folder }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Zugriff auf deinen Datenordner" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/wurde abgelehnt/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zugriff erlauben" }));

    expect(await screen.findByText("Ordner: Daten")).toBeInTheDocument();
  });

  it("explains a denied access and lets the person pick another folder", async () => {
    const folder = createMemoryFolder("Alt");
    folder.access = "prompt";
    folder.accessAfterRequest = "denied";
    const host = createMemoryFolderHost({ saved: folder });
    const { user } = setup(host);

    await user.click(await screen.findByRole("button", { name: "Zugriff erlauben" }));

    expect(screen.getByText(/wurde abgelehnt/)).toBeInTheDocument();

    const other = createMemoryFolder("Neu");
    other.access = "prompt";
    host.nextPick = other;
    await user.click(screen.getByRole("button", { name: "Anderen Ordner wählen …" }));

    expect(await screen.findByText(/Ordner „Neu“ wieder bearbeiten/)).toBeInTheDocument();
    expect(screen.queryByText(/wurde abgelehnt/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zugriff erlauben" }));

    expect(await screen.findByText("Ordner: Neu")).toBeInTheDocument();
  });

  it("shows the denied text at once when the browser blocks the folder", async () => {
    const folder = createMemoryFolder();
    folder.access = "denied";
    setup(createMemoryFolderHost({ saved: folder }));

    expect(await screen.findByText(/wurde abgelehnt/)).toBeInTheDocument();
  });

  it("shows an error when the access request fails", async () => {
    const folder = createMemoryFolder();
    folder.access = "prompt";
    folder.requestAccess = () => Promise.reject(new Error("no user activation"));
    const { user } = setup(createMemoryFolderHost({ saved: folder }));

    await user.click(await screen.findByRole("button", { name: "Zugriff erlauben" }));

    expect(screen.getByRole("alert")).toHaveTextContent("no user activation");
  });

  it("ignores a late result after it closed", async () => {
    const resolved = createMemoryFolderHost({ saved: createMemoryFolder() });
    setup(resolved).view.unmount();

    const rejected = createMemoryFolderHost();
    rejected.loadSaved = () => Promise.reject(new Error("late"));
    setup(rejected).view.unmount();

    // Wait for both promises. React would warn if the hook set state after unmount.
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
