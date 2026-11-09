import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { testAppInfo } from "../testing.ts";
import { parseEnvelope, serializeEnvelope } from "./envelope.ts";
import type { FolderHost } from "./folder.ts";
import { defineDataSchema } from "./schema.ts";
import { createDataFileStore, type DataFileStoreOptions } from "./store.tsx";
import { createMemoryFolder, createMemoryFolderHost, type MemoryFolder } from "./testing.ts";

// Version 1: { n: number }. Version 2: { count: number }.
const schema = defineDataSchema({
  app: "demo",
  validate: z.object({ count: z.number() }),
  initial: () => ({ count: 0 }),
  migrations: [(data) => ({ count: z.object({ n: z.number() }).parse(data).n })],
});

const app = testAppInfo({ name: "demo", title: "Demo", version: "1.0" });

function makeStore(options: Partial<DataFileStoreOptions> = {}) {
  const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
    app,
    autosaveDelayMs: 0,
    retryDelayMs: 60_000,
    ...options,
  });

  function Counter() {
    const { data, update } = useDataFile();
    return (
      <button
        type="button"
        onClick={() => {
          update((current) => ({ count: current.count + 1 }));
        }}
      >
        Zähler {data.count}
      </button>
    );
  }

  function setup(host?: FolderHost) {
    const user = userEvent.setup();
    render(
      <DataFileProvider {...(host && { folderHost: host })}>
        <Counter />
      </DataFileProvider>,
    );
    return user;
  }

  return { setup, Counter };
}

const { setup, Counter } = makeStore();

function dataFile(schemaVersion: number, data: unknown): string {
  return serializeEnvelope({ app: "demo", schemaVersion, appVersion: "1.0", data });
}

function fileData(folder: MemoryFolder, path = "demo.json"): unknown {
  return parseEnvelope(folder.files.get(path)?.text ?? "").data;
}

function readyHost(folder = createMemoryFolder()) {
  return { folder, host: createMemoryFolderHost({ saved: folder }) };
}

describe("data folder", () => {
  it("shows the header and asks for a folder on the first visit", async () => {
    const host = createMemoryFolderHost();
    host.nextPick = createMemoryFolder();
    const user = setup(host);

    expect(screen.getByRole("heading", { level: 1, name: "Demo" })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Ordner wählen …" }));

    expect(await screen.findByRole("button", { name: "Zähler 0" })).toBeInTheDocument();
    expect(screen.getByText("Pocket Apps Daten / demo.json")).toBeInTheDocument();
  });

  it("uses the folder of the browser by default", () => {
    setup();

    // jsdom has no File System Access API.
    expect(
      screen.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeInTheDocument();
  });
});

describe("load", () => {
  it("starts with the initial data when the file does not exist and writes nothing", async () => {
    const { folder, host } = readyHost();
    setup(host);

    expect(await screen.findByRole("button", { name: "Zähler 0" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
    expect(folder.files.size).toBe(0);
  });

  it("shows the data of the file", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo.json", { text: dataFile(2, { count: 5 }), lastModified: 1 });
    setup(host);

    expect(await screen.findByRole("button", { name: "Zähler 5" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
  });

  it("migrates old data, keeps a backup of the old file and saves the new shape", async () => {
    const { folder, host } = readyHost();
    const oldText = dataFile(1, { n: 3 });
    folder.files.set("demo.json", { text: oldText, lastModified: 1 });
    setup(host);

    expect(await screen.findByRole("button", { name: "Zähler 3" })).toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(folder.files.get("demo.backup-v1.json")?.text).toBe(oldText);
    expect(parseEnvelope(folder.files.get("demo.json")?.text ?? "")).toMatchObject({
      schemaVersion: 2,
      data: { count: 3 },
    });
  });

  it("shows a clear error for an invalid file and loads again on request", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo.json", { text: "not json", lastModified: 1 });
    const user = setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent("keine gültige JSON-Datei");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die App kann die Datei „demo.json“ im Ordner „Pocket Apps Daten“ nicht öffnen.",
    );

    folder.files.set("demo.json", { text: dataFile(2, { count: 7 }), lastModified: 2 });
    await user.click(screen.getByRole("button", { name: "Erneut laden" }));

    expect(await screen.findByRole("button", { name: "Zähler 7" })).toBeInTheDocument();
  });

  it("keeps an older backup and writes the new backup next to it", async () => {
    const { folder, host } = readyHost();
    const oldText = dataFile(1, { n: 3 });
    folder.files.set("demo.json", { text: oldText, lastModified: 1 });
    folder.files.set("demo.backup-v1.json", { text: "older", lastModified: 1 });
    folder.files.set("demo.backup-v1-2.json", { text: "older 2", lastModified: 1 });
    setup(host);

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(folder.files.get("demo.backup-v1.json")?.text).toBe("older");
    expect(folder.files.get("demo.backup-v1-2.json")?.text).toBe("older 2");
    expect(folder.files.get("demo.backup-v1-3.json")?.text).toBe(oldText);
  });

  it("asks for access again when the browser lost it, then loads", async () => {
    const { folder, host } = readyHost();
    const read = folder.read;
    folder.read = () => Promise.reject(new DOMException("Denied", "NotAllowedError"));
    const user = setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die App hat keinen Zugriff auf den Datenordner.",
    );

    folder.access = "prompt";
    folder.read = read;
    await user.click(screen.getByRole("button", { name: "Erneut laden" }));

    expect(await screen.findByRole("button", { name: "Zähler 0" })).toBeInTheDocument();
    expect(folder.access).toBe("granted");
  });

  it("explains a missing folder", async () => {
    const { folder, host } = readyHost();
    folder.read = () => Promise.reject(new DOMException("Gone", "NotFoundError"));
    setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die App findet den Datenordner nicht.",
    );
  });

  it("does not write the new shape when the backup fails", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo.json", { text: dataFile(1, { n: 3 }), lastModified: 1 });
    folder.writeError = new Error("read-only");
    setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unerwarteter Fehler: read-only");
    expect(folder.files.size).toBe(1);
  });

  it("shows unexpected errors that are not Error objects", async () => {
    const { folder, host } = readyHost();
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- This test needs a non-Error rejection.
    folder.read = () => Promise.reject("kaputt");
    setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unerwarteter Fehler: kaputt");
  });
});

describe("save", () => {
  it("saves changes automatically", async () => {
    const { folder, host } = readyHost();
    const user = setup(host);

    await user.click(await screen.findByRole("button", { name: "Zähler 0" }));

    expect(screen.getByRole("button", { name: "Zähler 1" })).toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(parseEnvelope(folder.files.get("demo.json")?.text ?? "")).toMatchObject({
      app: "demo",
      schemaVersion: 2,
      savedWith: "1.0",
      data: { count: 1 },
    });
  });

  it("saves again when the data changes during a save", async () => {
    const { folder, host } = readyHost();
    const write = folder.write;
    const blocked: { finish?: () => void } = {};
    folder.write = (path, text) =>
      new Promise((resolve) => {
        blocked.finish = () => {
          resolve(write(path, text));
        };
      });
    const user = setup(host);

    await user.click(await screen.findByRole("button", { name: "Zähler 0" }));
    await vi.waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Speichert …");
    });
    await user.click(screen.getByRole("button", { name: "Zähler 1" }));
    folder.write = write;
    blocked.finish?.();

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(fileData(folder)).toEqual({ count: 2 });
  });

  it("shows an error when a save fails and saves on retry", async () => {
    const { folder, host } = readyHost();
    folder.writeError = new Error("disk full");
    const user = setup(host);

    await user.click(await screen.findByRole("button", { name: "Zähler 0" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("disk full");
    expect(screen.getByRole("status")).toHaveTextContent("Speichern fehlgeschlagen");

    folder.writeError = null;
    await user.click(screen.getByRole("button", { name: "Jetzt erneut versuchen" }));

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fileData(folder)).toEqual({ count: 1 });
  });

  it("asks for access again on retry when the browser lost it", async () => {
    const { folder, host } = readyHost();
    folder.writeError = new DOMException("Denied", "NotAllowedError");
    const user = setup(host);

    await user.click(await screen.findByRole("button", { name: "Zähler 0" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Speichern fehlgeschlagen: Die App hat keinen Zugriff auf den Datenordner.",
    );

    folder.access = "prompt";
    folder.writeError = null;
    await user.click(screen.getByRole("button", { name: "Jetzt erneut versuchen" }));

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(folder.access).toBe("granted");
  });

  it("still tries again when the access request fails", async () => {
    const { folder, host } = readyHost();
    folder.writeError = new Error("disk full");
    const user = setup(host);
    await user.click(await screen.findByRole("button", { name: "Zähler 0" }));
    await screen.findByRole("alert");

    folder.queryAccess = () => Promise.reject(new Error("no API"));
    folder.writeError = null;
    await user.click(screen.getByRole("button", { name: "Jetzt erneut versuchen" }));

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
  });

  it("tries again automatically after a failed save", async () => {
    const quick = makeStore({ retryDelayMs: 10 });
    const { folder, host } = readyHost();
    folder.writeError = new Error("disk full");
    const user = quick.setup(host);

    await user.click(await screen.findByRole("button", { name: "Zähler 0" }));
    await screen.findByRole("alert");
    folder.writeError = null;

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(fileData(folder)).toEqual({ count: 1 });
  });

  it("warns before the tab closes with unsaved changes", async () => {
    const { folder, host } = readyHost();
    folder.writeError = new Error("disk full");
    const user = setup(host);
    await user.click(await screen.findByRole("button", { name: "Zähler 0" }));
    await screen.findByRole("alert");

    const whileUnsaved = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(whileUnsaved);
    expect(whileUnsaved.defaultPrevented).toBe(true);

    folder.writeError = null;
    await user.click(screen.getByRole("button", { name: "Jetzt erneut versuchen" }));
    await screen.findByText("Gespeichert");

    const afterSave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(afterSave);
    expect(afterSave.defaultPrevented).toBe(false);
  });
});

describe("conflict", () => {
  async function conflict() {
    const { folder, host } = readyHost();
    folder.files.set("demo.json", { text: dataFile(2, { count: 5 }), lastModified: 1 });
    const user = setup(host);
    await screen.findByRole("button", { name: "Zähler 5" });
    folder.changeElsewhere("demo.json", dataFile(2, { count: 50 }));

    await user.click(screen.getByRole("button", { name: "Zähler 5" }));
    await screen.findByText("Nicht gespeichert: Konflikt");
    return { folder, user };
  }

  it("does not overwrite a file that changed elsewhere", async () => {
    const { folder, user } = await conflict();

    expect(screen.getByRole("alert")).toHaveTextContent("Jemand hat die Datei woanders geändert");
    expect(fileData(folder)).toEqual({ count: 50 });

    // More changes keep the conflict.
    await user.click(screen.getByRole("button", { name: "Zähler 6" }));

    expect(screen.getByRole("status")).toHaveTextContent("Nicht gespeichert: Konflikt");
    expect(fileData(folder)).toEqual({ count: 50 });
  });

  it("loads the other version on request", async () => {
    const { folder, user } = await conflict();

    await user.click(
      screen.getByRole("button", { name: "Neu laden (meine Änderungen verwerfen)" }),
    );

    expect(await screen.findByRole("button", { name: "Zähler 50" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
    expect(fileData(folder)).toEqual({ count: 50 });
  });

  it("overwrites the other version on request", async () => {
    const { folder, user } = await conflict();

    await user.click(screen.getByRole("button", { name: "Meine Version speichern" }));

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(fileData(folder)).toEqual({ count: 6 });
  });

  it("shows an error when the folder cannot be read for the overwrite", async () => {
    const { folder, user } = await conflict();
    folder.lastModified = () => Promise.reject(new Error("offline"));

    await user.click(screen.getByRole("button", { name: "Meine Version speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    expect(screen.getByRole("status")).toHaveTextContent("Speichern fehlgeschlagen");
  });
});

describe("options", () => {
  it("uses the default delays and ignores a late load after it closed", async () => {
    const defaults = createDataFileStore(schema, { app });
    const { folder, host } = readyHost();
    const blocked: { finish?: () => void } = {};
    folder.read = () =>
      new Promise((resolve) => {
        blocked.finish = () => {
          resolve(null);
        };
      });
    const view = render(
      <defaults.DataFileProvider folderHost={host}>
        <p>App</p>
      </defaults.DataFileProvider>,
    );
    await vi.waitFor(() => {
      expect(blocked.finish).toBeDefined();
    });

    view.unmount();
    blocked.finish?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("App")).not.toBeInTheDocument();
  });
});

describe("useDataFile", () => {
  it("throws outside of the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Counter />)).toThrow("inside <DataFileProvider>");
  });
});
