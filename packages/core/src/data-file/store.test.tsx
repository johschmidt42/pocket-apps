import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { parseEnvelope, serializeEnvelope } from "./envelope.ts";
import { defineDataSchema } from "./schema.ts";
import { backupFileName, createDataFileStore } from "./store.tsx";
import { testAppInfo } from "../testing.ts";
import { createMemoryFileAccess, type MemoryFileAccess } from "./testing.ts";

// Version 1: { n: number }. Version 2: { count: number }.
const schema = defineDataSchema({
  app: "demo",
  validate: z.object({ count: z.number() }),
  initial: () => ({ count: 0 }),
  migrations: [(data) => ({ count: z.object({ n: z.number() }).parse(data).n })],
});

const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: testAppInfo({ title: "Demo", version: "1.0.0" }),
  autosaveDelayMs: 0,
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

function setup(fake: MemoryFileAccess) {
  const user = userEvent.setup();
  render(
    <DataFileProvider fileAccess={fake}>
      <Counter />
    </DataFileProvider>,
  );
  return user;
}

function dataFile(schemaVersion: number, data: unknown): string {
  return serializeEnvelope({ app: "demo", schemaVersion, appVersion: "1.0.0", data });
}

describe("start screen", () => {
  it("shows the title and the file actions", () => {
    setup(createMemoryFileAccess({ directSave: true }));

    expect(screen.getByRole("heading", { level: 1, name: "Demo" })).toBeInTheDocument();
    expect(screen.getByText("Version 1.0.0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neue Datei" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Datei öffnen" })).toBeInTheDocument();
    expect(screen.queryByText(/kann nicht direkt/)).not.toBeInTheDocument();
  });

  it("explains the download fallback when the browser cannot save directly", () => {
    setup(createMemoryFileAccess({ directSave: false }));

    expect(screen.getByText(/kann nicht direkt in die Datei speichern/)).toBeInTheDocument();
  });

  it("uses the real browser file access by default", () => {
    render(
      <DataFileProvider>
        <Counter />
      </DataFileProvider>,
    );

    // jsdom has no File System Access API.
    expect(screen.getByText(/kann nicht direkt in die Datei speichern/)).toBeInTheDocument();
  });
});

describe("new file", () => {
  it("without direct save: starts with the initial data and saves by download", async () => {
    const fake = createMemoryFileAccess({ directSave: false });
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Neue Datei" }));

    expect(screen.getByRole("button", { name: "Zähler 0" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Nicht gespeichert");

    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(fake.downloads).toHaveLength(1);
    expect(fake.downloads[0]?.name).toBe("demo.json");
    expect(parseEnvelope(fake.downloads[0]?.text ?? "")).toMatchObject({
      app: "demo",
      schemaVersion: 2,
      savedWith: "1.0.0",
      data: { count: 0 },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
  });

  it("with direct save: writes the new file at once", async () => {
    const fake = createMemoryFileAccess({ directSave: true });
    fake.nextCreateName = "mine.json";
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Neue Datei" }));

    expect(screen.getByText("mine.json")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
    expect(screen.queryByRole("button", { name: "Speichern" })).not.toBeInTheDocument();
    expect(parseEnvelope(fake.written.get("mine.json") ?? "").data).toEqual({ count: 0 });
  });

  it("with direct save: stays on the start screen when the user cancels", async () => {
    const fake = createMemoryFileAccess({ directSave: true });
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Neue Datei" }));

    expect(screen.getByRole("button", { name: "Neue Datei" })).toBeInTheDocument();
  });
});

describe("open file", () => {
  it("stays on the start screen when the user cancels", async () => {
    const user = setup(createMemoryFileAccess({ directSave: false }));

    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));

    expect(screen.getByRole("button", { name: "Datei öffnen" })).toBeInTheDocument();
  });

  it("with direct save: shows the data and saves changes automatically", async () => {
    const fake = createMemoryFileAccess({ directSave: true });
    fake.nextOpen = {
      name: "mine.json",
      text: dataFile(2, { count: 5 }),
      handle: { name: "mine.json" },
    };
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));
    await user.click(screen.getByRole("button", { name: "Zähler 5" }));

    expect(screen.getByRole("button", { name: "Zähler 6" })).toBeInTheDocument();
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(parseEnvelope(fake.written.get("mine.json") ?? "").data).toEqual({ count: 6 });
  });

  it("migrates old data and downloads a backup of the old file first", async () => {
    const fake = createMemoryFileAccess({ directSave: false });
    const oldText = dataFile(1, { n: 3 });
    fake.nextOpen = { name: "old.json", text: oldText, handle: null };
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));

    expect(screen.getByRole("button", { name: "Zähler 3" })).toBeInTheDocument();
    expect(fake.downloads).toEqual([{ name: "old.backup-v1.json", text: oldText }]);
    expect(screen.getByRole("status")).toHaveTextContent("Nicht gespeichert");
    expect(screen.getByText(/in ein neues Format umgewandelt/)).toBeInTheDocument();
  });

  it("with direct save: does not overwrite a migrated file before the user saves", async () => {
    const fake = createMemoryFileAccess({ directSave: true });
    fake.nextOpen = { name: "old.json", text: dataFile(1, { n: 3 }), handle: { name: "old.json" } };
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));
    // Wait longer than the autosave delay (0 ms in this test).
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fake.written.size).toBe(0);
    expect(screen.getByRole("status")).toHaveTextContent("Nicht gespeichert");

    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(parseEnvelope(fake.written.get("old.json") ?? "").data).toEqual({ count: 3 });
    expect(screen.queryByText(/in ein neues Format umgewandelt/)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
  });

  it("shows a clear error for an invalid file", async () => {
    const fake = createMemoryFileAccess({ directSave: false });
    fake.nextOpen = { name: "bad.json", text: "not json", handle: null };
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));

    expect(screen.getByRole("alert")).toHaveTextContent("keine gültige JSON-Datei");
  });

  it("shows unexpected errors that are not Error objects", async () => {
    const fake = createMemoryFileAccess({ directSave: false });
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- This test needs a non-Error rejection.
    fake.openFile = () => Promise.reject("kaputt");
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Unerwarteter Fehler: kaputt");
  });

  it("shows unexpected errors", async () => {
    const fake = createMemoryFileAccess({ directSave: false });
    fake.openFile = () => Promise.reject(new Error("boom"));
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Unerwarteter Fehler: boom");
  });
});

describe("file bar", () => {
  it("shows an error when the automatic save fails", async () => {
    const fake = createMemoryFileAccess({ directSave: true });
    fake.nextOpen = {
      name: "mine.json",
      text: dataFile(2, { count: 0 }),
      handle: { name: "mine.json" },
    };
    fake.writeFile = () => Promise.reject(new Error("disk full"));
    const user = setup(fake);

    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));
    await user.click(screen.getByRole("button", { name: "Zähler 0" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Automatisches Speichern ist fehlgeschlagen",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("disk full");
    expect(screen.getByRole("status")).toHaveTextContent("Nicht gespeichert");

    fake.writeFile = (handle, text) => {
      fake.written.set(handle.name, text);
      return Promise.resolve();
    };
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gespeichert");
  });

  it("asks before it discards unsaved changes", async () => {
    const fake = createMemoryFileAccess({ directSave: false });
    const user = setup(fake);
    await user.click(screen.getByRole("button", { name: "Neue Datei" }));
    const openFile = vi.spyOn(fake, "openFile");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Öffnen" }));
    await user.click(screen.getByRole("button", { name: "Neu" }));

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(openFile).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Zähler 0" })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Zähler 0" }));
    await user.click(screen.getByRole("button", { name: "Neu" }));

    expect(screen.getByRole("button", { name: "Zähler 0" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Öffnen" }));

    expect(openFile).toHaveBeenCalledTimes(1);
  });

  it("does not ask when there are no unsaved changes", async () => {
    const fake = createMemoryFileAccess({ directSave: true });
    fake.nextCreateName = "mine.json";
    const user = setup(fake);
    await user.click(screen.getByRole("button", { name: "Neue Datei" }));
    const confirm = vi.spyOn(window, "confirm");

    await user.click(screen.getByRole("button", { name: "Öffnen" }));

    expect(confirm).not.toHaveBeenCalled();
  });

  it("warns before the tab closes with unsaved changes", async () => {
    const user = setup(createMemoryFileAccess({ directSave: false }));
    await user.click(screen.getByRole("button", { name: "Neue Datei" }));

    const whileDirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(whileDirty);
    expect(whileDirty.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Speichern" }));

    const afterSave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(afterSave);
    expect(afterSave.defaultPrevented).toBe(false);
  });
});

describe("useDataFile", () => {
  it("throws outside of the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Counter />)).toThrow("inside <DataFileProvider>");
  });
});

describe("backupFileName", () => {
  it("adds the old version before the extension", () => {
    expect(backupFileName("list.json", 2)).toBe("list.backup-v2.json");
    expect(backupFileName("list", 1)).toBe("list.backup-v1.json");
  });
});
