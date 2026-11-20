import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DataFolderGate } from "./data-folder-gate.tsx";
import type { FolderHost } from "./folder.ts";
import { createMemoryFolder, createMemoryFolderHost } from "./testing.ts";

function setup(host: FolderHost, optional = false) {
  const user = userEvent.setup();
  const view = render(
    <DataFolderGate host={host} optional={optional}>
      {(folder, changeFolder) => (
        <>
          <p>Ordner: {folder?.name ?? "keiner"}</p>
          <button type="button" onClick={changeFolder}>
            Wechseln
          </button>
        </>
      )}
    </DataFolderGate>,
  );
  return { user, view };
}

describe("DataFolderGate", () => {
  it("explains when the browser offers no storage at all", () => {
    setup(createMemoryFolderHost({ kinds: [] }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Dieser Browser kann keine Daten speichern" }),
    ).toBeInTheDocument();
  });

  it("offers all places in Chrome and Edge", async () => {
    setup(createMemoryFolderHost());

    expect(
      await screen.findByRole("heading", { level: 2, name: "Wo sollen deine Daten liegen?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Ordner auf diesem Computer" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "OneDrive" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Dropbox" })).toBeInTheDocument();
    // Each cloud storage says that all devices see the same data.
    expect(screen.getAllByText(/dieselben Daten auf all deinen Geräten/)).toHaveLength(2);
  });

  it("offers only OneDrive in browsers without a folder dialog", async () => {
    const host = createMemoryFolderHost({ kinds: ["onedrive"] });
    const { user } = setup(host);

    await user.click(await screen.findByRole("button", { name: "Mit OneDrive verbinden" }));

    expect(host.pickedKind).toBe("onedrive");
    expect(screen.queryByRole("button", { name: "Ordner wählen …" })).not.toBeInTheDocument();
    expect(screen.queryByText("Ordner auf diesem Computer")).not.toBeInTheDocument();
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

    expect(
      screen.getByRole("heading", { level: 2, name: "Wo sollen deine Daten liegen?" }),
    ).toBeVisible();

    host.nextPick = createMemoryFolder("Daten");
    await user.click(pickButton);

    expect(await screen.findByText("Ordner: Daten")).toBeInTheDocument();
    expect(host.saved?.name).toBe("Daten");
    expect(host.pickedKind).toBe("local");
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
    expect(screen.queryByText(/hat den Zugriff abgelehnt/)).not.toBeInTheDocument();

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

    expect(screen.getByText(/hat den Zugriff abgelehnt/)).toBeInTheDocument();

    const other = createMemoryFolder("Neu");
    other.access = "prompt";
    host.nextPick = other;
    await user.click(screen.getByRole("button", { name: "Anderen Speicherort wählen …" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Speicherort wählen" })).getByRole("button", {
        name: "Ordner wählen …",
      }),
    );

    expect(await screen.findByText(/Ordner „Neu“ wieder bearbeiten/)).toBeInTheDocument();
    expect(screen.queryByText(/hat den Zugriff abgelehnt/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zugriff erlauben" }));

    expect(await screen.findByText("Ordner: Neu")).toBeInTheDocument();
  });

  it("asks for a new OneDrive login when it expired", async () => {
    const folder = createMemoryFolder("OneDrive", "onedrive");
    folder.access = "prompt";
    const { user } = setup(createMemoryFolderHost({ saved: folder }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Bei OneDrive anmelden" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Deine Daten bleiben in OneDrive.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(await screen.findByText("Ordner: OneDrive")).toBeInTheDocument();
  });

  it("asks for a new Dropbox login when it ended", async () => {
    const folder = createMemoryFolder("Dropbox", "dropbox");
    folder.access = "prompt";
    setup(createMemoryFolderHost({ saved: folder }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Bei Dropbox anmelden" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Deine Daten bleiben in Dropbox.")).toBeInTheDocument();
  });

  it("shows the denied text at once when the browser blocks the folder", async () => {
    const folder = createMemoryFolder();
    folder.access = "denied";
    setup(createMemoryFolderHost({ saved: folder }));

    expect(await screen.findByText(/hat den Zugriff abgelehnt/)).toBeInTheDocument();
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

  it("lets the person change the folder", async () => {
    const host = createMemoryFolderHost({ saved: createMemoryFolder("Alt") });
    const { user } = setup(host);
    await screen.findByText("Ordner: Alt");

    host.nextPick = createMemoryFolder("Neu");
    await user.click(screen.getByRole("button", { name: "Wechseln" }));
    const dialog = screen.getByRole("dialog", { name: "Speicherort wählen" });
    await user.click(within(dialog).getByRole("button", { name: "Ordner wählen …" }));

    expect(await screen.findByText("Ordner: Neu")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the folder when the person closes the choice", async () => {
    const host = createMemoryFolderHost({ saved: createMemoryFolder("Alt") });
    const { user } = setup(host);
    await screen.findByText("Ordner: Alt");

    await user.click(screen.getByRole("button", { name: "Wechseln" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(host.pickedKind).toBeNull();
    expect(screen.getByText("Ordner: Alt")).toBeInTheDocument();
  });

  it("keeps the app and shows an error when the change fails", async () => {
    const host = createMemoryFolderHost({ saved: createMemoryFolder("Alt") });
    const { user } = setup(host);
    await screen.findByText("Ordner: Alt");

    host.pick = () => Promise.reject(new Error("blocked"));
    await user.click(screen.getByRole("button", { name: "Wechseln" }));
    await user.click(screen.getByRole("button", { name: "Mit OneDrive verbinden" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("blocked");
    expect(screen.getByText("Ordner: Alt")).toBeInTheDocument();
  });
});

describe("DataFolderGate with an optional folder", () => {
  it("shows a notice and the app in other browsers", () => {
    setup(createMemoryFolderHost({ kinds: [] }), true);

    expect(
      screen.getByText("Apps mit Daten funktionieren in diesem Browser nicht."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ordner: keiner")).toBeInTheDocument();
  });

  it("shows the task as a section above the app", async () => {
    setup(createMemoryFolderHost(), true);

    expect(
      await screen.findByRole("region", { name: "Wo sollen deine Daten liegen?" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.getByText("Ordner: keiner")).toBeInTheDocument();
  });

  it("shows the access task and the app", async () => {
    const folder = createMemoryFolder();
    folder.access = "prompt";
    setup(createMemoryFolderHost({ saved: folder }), true);

    expect(
      await screen.findByRole("region", { name: "Zugriff auf deinen Datenordner" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ordner: keiner")).toBeInTheDocument();
  });
});
