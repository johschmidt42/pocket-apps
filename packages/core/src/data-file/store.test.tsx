import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { testAppInfo } from "../testing.ts";
import { parseEnvelope, serializeEnvelope } from "./envelope.ts";
import type { FileSnapshot, FolderHost } from "./folder.ts";
import { MAX_COLORED_LENGTH } from "./raw-data-dialog.tsx";
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

function fileData(folder: MemoryFolder, path = "demo/demo.json"): unknown {
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
    expect(screen.getByText("Pocket Apps Daten / demo/demo.json")).toBeInTheDocument();
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
    folder.files.set("demo/demo.json", { text: dataFile(2, { count: 5 }), lastModified: 1 });
    setup(host);

    expect(await screen.findByRole("button", { name: "Zähler 5" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
  });

  it("moves a data file from the old place into the folder of the app", async () => {
    const { folder, host } = readyHost();
    const text = dataFile(2, { count: 4 });
    folder.files.set("demo.json", { text, lastModified: 1 });
    setup(host);

    expect(await screen.findByRole("button", { name: "Zähler 4" })).toBeInTheDocument();
    expect(folder.files.get("demo/demo.json")?.text).toBe(text);
    expect(folder.files.has("demo.json")).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
  });

  it("keeps the old file when the move fails", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo.json", { text: dataFile(2, { count: 4 }), lastModified: 1 });
    folder.writeError = new Error("Kein Platz");
    setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent("Kein Platz");
    expect(folder.files.has("demo.json")).toBe(true);
  });

  it("keeps the old file when the copy is not the same", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo.json", { text: dataFile(2, { count: 4 }), lastModified: 1 });
    const write = folder.write;
    folder.write = (path, content) => write(path, typeof content === "string" ? "anders" : content);
    setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die App konnte „demo.json“ nicht in den Ordner „demo“ verschieben.",
    );
    expect(folder.files.has("demo.json")).toBe(true);
  });

  it("migrates old data, keeps a backup of the old file and saves the new shape", async () => {
    const { folder, host } = readyHost();
    const oldText = dataFile(1, { n: 3 });
    folder.files.set("demo/demo.json", { text: oldText, lastModified: 1 });
    setup(host);

    expect(await screen.findByRole("button", { name: "Zähler 3" })).toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(folder.files.get("demo/demo.backup-v1.json")?.text).toBe(oldText);
    expect(parseEnvelope(folder.files.get("demo/demo.json")?.text ?? "")).toMatchObject({
      schemaVersion: 2,
      data: { count: 3 },
    });
  });

  it("shows a clear error for an invalid file and loads again on request", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo/demo.json", { text: "not json", lastModified: 1 });
    const user = setup(host);

    expect(await screen.findByRole("alert")).toHaveTextContent("keine gültige JSON-Datei");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die App kann die Datei „demo/demo.json“ im Ordner „Pocket Apps Daten“ nicht öffnen.",
    );

    folder.files.set("demo/demo.json", { text: dataFile(2, { count: 7 }), lastModified: 2 });
    await user.click(screen.getByRole("button", { name: "Erneut laden" }));

    expect(await screen.findByRole("button", { name: "Zähler 7" })).toBeInTheDocument();
  });

  it("keeps an older backup and writes the new backup next to it", async () => {
    const { folder, host } = readyHost();
    const oldText = dataFile(1, { n: 3 });
    folder.files.set("demo/demo.json", { text: oldText, lastModified: 1 });
    folder.files.set("demo/demo.backup-v1.json", { text: "older", lastModified: 1 });
    folder.files.set("demo/demo.backup-v1-2.json", { text: "older 2", lastModified: 1 });
    setup(host);

    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(folder.files.get("demo/demo.backup-v1.json")?.text).toBe("older");
    expect(folder.files.get("demo/demo.backup-v1-2.json")?.text).toBe("older 2");
    expect(folder.files.get("demo/demo.backup-v1-3.json")?.text).toBe(oldText);
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
    folder.files.set("demo/demo.json", { text: dataFile(1, { n: 3 }), lastModified: 1 });
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
    expect(parseEnvelope(folder.files.get("demo/demo.json")?.text ?? "")).toMatchObject({
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
    folder.files.set("demo/demo.json", { text: dataFile(2, { count: 5 }), lastModified: 1 });
    const user = setup(host);
    await screen.findByRole("button", { name: "Zähler 5" });
    folder.changeElsewhere("demo/demo.json", dataFile(2, { count: 50 }));

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

describe("change folder", () => {
  it("loads the file of the new folder", async () => {
    const { folder, host } = readyHost();
    const other = createMemoryFolder("Andere Daten");
    other.files.set("demo/demo.json", { text: dataFile(2, { count: 9 }), lastModified: 1 });
    host.nextPick = other;
    const user = setup(host);
    await screen.findByRole("button", { name: "Zähler 0" });

    await user.click(screen.getByRole("button", { name: "Ordner wechseln" }));

    expect(await screen.findByRole("button", { name: "Zähler 9" })).toBeInTheDocument();
    expect(screen.getByText("Andere Daten / demo/demo.json")).toBeInTheDocument();
    expect(folder.files.size).toBe(0);
  });

  it("is only possible when all changes are saved", async () => {
    const { folder, host } = readyHost();
    folder.writeError = new Error("disk full");
    const user = setup(host);

    await user.click(await screen.findByRole("button", { name: "Zähler 0" }));
    await screen.findByRole("alert");

    expect(screen.getByRole("button", { name: "Ordner wechseln" })).toBeDisabled();
  });
});

describe("optional folder", () => {
  it("shows the app with the initial data before the person picks a folder", async () => {
    const optional = createDataFileStore(schema, { app, folderOptional: true });
    function Info() {
      const { data, hasFolder, update } = optional.useDataFile();
      return (
        <button
          type="button"
          onClick={() => {
            update((current) => ({ count: current.count + 1 }));
          }}
        >
          {hasFolder ? "mit Ordner" : "ohne Ordner"} {data.count}
        </button>
      );
    }
    const user = userEvent.setup();
    render(
      <optional.DataFileProvider folderHost={createMemoryFolderHost()}>
        <Info />
      </optional.DataFileProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "ohne Ordner 0" }));

    expect(screen.getByRole("button", { name: "ohne Ordner 0" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Datenordner wählen" })).toBeInTheDocument();
  });
});

describe("broken file", () => {
  it("lets the user pick another folder", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo/demo.json", { text: "not json", lastModified: 1 });
    host.nextPick = createMemoryFolder("Neu");
    const user = setup(host);

    await user.click(await screen.findByRole("button", { name: "Anderen Ordner wählen …" }));

    expect(await screen.findByRole("button", { name: "Zähler 0" })).toBeInTheDocument();
    expect(screen.getByText("Neu / demo/demo.json")).toBeInTheDocument();
  });

  it("keeps an app with an optional folder usable", async () => {
    const optional = createDataFileStore(schema, { app, folderOptional: true });
    const folder = createMemoryFolder();
    folder.files.set("demo/demo.json", { text: "not json", lastModified: 1 });
    render(
      <optional.DataFileProvider folderHost={createMemoryFolderHost({ saved: folder })}>
        <p>Inhalt</p>
      </optional.DataFileProvider>,
    );

    expect(await screen.findByRole("region", { name: "Datenordner" })).toHaveTextContent(
      "keine gültige JSON-Datei",
    );
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });
});

describe("options", () => {
  it("uses the default delays and ignores a late load after it closed", async () => {
    const defaults = createDataFileStore(schema, { app });
    const { folder, host } = readyHost();
    // The first read waits until the test lets it finish. Later reads (the old place of the
    // file) finish at once.
    const blocked: { finish?: () => void } = {};
    folder.read = () =>
      blocked.finish
        ? Promise.resolve(null)
        : new Promise((resolve) => {
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

describe("raw data", () => {
  const FILE_BUTTON = { name: "Pocket Apps Daten / demo/demo.json: Rohdaten ansehen" };

  it("shows the data file with indents and colors, but no field to change it", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo/demo.json", { text: dataFile(2, { count: 5 }), lastModified: 1 });
    const user = setup(host);

    // The tooltip shows at once.
    await user.hover(await screen.findByRole("button", FILE_BUTTON));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Rohdaten ansehen");
    await user.click(screen.getByRole("button", FILE_BUTTON));

    const dialog = await screen.findByRole("dialog", { name: "demo/demo.json" });
    expect(dialog).toHaveTextContent("Die Rohdaten aus dem Ordner „Pocket Apps Daten“");
    expect(await screen.findByLabelText("Inhalt der Datei")).toHaveTextContent('"count": 5');
    // Each key is a colored part. A color has no role, so the test checks the class.
    expect(screen.getByText('"count"')).toHaveClass("text-chart-7");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/noch nicht gespeichert/)).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains a file that does not exist yet", async () => {
    const { host } = readyHost();
    const user = setup(host);

    await user.click(await screen.findByRole("button", FILE_BUTTON));

    expect(await screen.findByText(/Die Datei gibt es noch nicht/)).toBeInTheDocument();
  });

  it("shows a file that is not JSON as it is", async () => {
    const { folder, host } = readyHost();
    const user = setup(host);
    await screen.findByRole("button", { name: "Zähler 0" });
    folder.files.set("demo/demo.json", { text: "kein JSON", lastModified: 1 });

    await user.click(screen.getByRole("button", FILE_BUTTON));

    expect(await screen.findByText(/kein gültiges JSON/)).toBeInTheDocument();
    expect(screen.getByLabelText("Inhalt der Datei")).toHaveTextContent("kein JSON");
  });

  it("explains a file that cannot be read", async () => {
    const { folder, host } = readyHost();
    const user = setup(host);
    await screen.findByRole("button", { name: "Zähler 0" });
    folder.read = () => Promise.reject(new Error("Zugriff verweigert"));

    await user.click(screen.getByRole("button", FILE_BUTTON));

    expect(
      await screen.findByText(
        "Die Datei lässt sich nicht lesen: Unerwarteter Fehler: Zugriff verweigert",
      ),
    ).toBeInTheDocument();
  });

  it("asks for access again when the browser lost it", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo/demo.json", { text: dataFile(2, { count: 5 }), lastModified: 1 });
    const user = setup(host);
    await screen.findByRole("button", { name: "Zähler 5" });
    folder.access = "prompt";

    await user.click(screen.getByRole("button", FILE_BUTTON));

    expect(await screen.findByLabelText("Inhalt der Datei")).toHaveTextContent('"count": 5');
    expect(folder.access).toBe("granted");
  });

  it("shows the raw data of a broken file", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo/demo.json", { text: "{ kaputt", lastModified: 1 });
    const user = setup(host);

    await user.click(await screen.findByRole("button", { name: "Rohdaten ansehen" }));

    expect(await screen.findByText(/kein gültiges JSON/)).toBeInTheDocument();
    expect(screen.getByLabelText("Inhalt der Datei")).toHaveTextContent("{ kaputt");
  });

  it("tells about changes that are not saved yet", async () => {
    const { folder, host } = readyHost();
    folder.files.set("demo/demo.json", { text: dataFile(2, { count: 5 }), lastModified: 1 });
    const { setup: setupSlow } = makeStore({ autosaveDelayMs: 60_000 });
    const user = setupSlow(host);

    await user.click(await screen.findByRole("button", { name: "Zähler 5" }));
    await user.click(screen.getByRole("button", FILE_BUTTON));

    expect(await screen.findByText(/noch nicht gespeichert/)).toBeInTheDocument();
    // The view shows the file, not the changed data.
    expect(await screen.findByLabelText("Inhalt der Datei")).toHaveTextContent('"count": 5');
  });

  it("shows a large file without colors", async () => {
    const { folder, host } = readyHost();
    const long = "x".repeat(MAX_COLORED_LENGTH);
    folder.files.set("demo/demo.json", { text: dataFile(2, { count: 1, long }), lastModified: 1 });
    const user = setup(host);

    await user.click(await screen.findByRole("button", FILE_BUTTON));

    expect(await screen.findByLabelText("Inhalt der Datei")).toHaveTextContent('"count": 1');
    expect(screen.queryByText('"count"')).not.toBeInTheDocument();
  });

  it("ignores a read that ends after a close or after a newer click", async () => {
    const { folder, host } = readyHost();
    const finish: ((file: FileSnapshot | null) => void)[] = [];
    const user = setup(host);
    await screen.findByRole("button", { name: "Zähler 0" });
    folder.read = () =>
      new Promise((resolve) => {
        finish.push(resolve);
      });

    await user.click(screen.getByRole("button", FILE_BUTTON));
    await user.keyboard("{Escape}");
    await act(async () => {
      finish[0]?.({ text: dataFile(2, { count: 1 }), lastModified: 1 });
      await Promise.resolve();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", FILE_BUTTON));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", FILE_BUTTON));
    await act(async () => {
      finish[1]?.({ text: dataFile(2, { count: 2 }), lastModified: 1 });
      await Promise.resolve();
    });
    // The first of the two reads ended late: the dialog still waits for the newer read.
    expect(screen.getByText("Lädt …")).toBeInTheDocument();
    await act(async () => {
      finish[2]?.({ text: dataFile(2, { count: 3 }), lastModified: 1 });
      await Promise.resolve();
    });
    expect(await screen.findByLabelText("Inhalt der Datei")).toHaveTextContent('"count": 3');
  });
});
