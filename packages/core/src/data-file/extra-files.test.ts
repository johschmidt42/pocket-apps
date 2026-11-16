import { describe, expect, it } from "vitest";
import { extraFiles, isExtraFileName } from "./extra-files.ts";
import { createMemoryFolder } from "./testing.ts";

describe("isExtraFileName", () => {
  it("allows simple names with an extension, but not the data file and its backups", () => {
    expect(isExtraFileName("lebenslauf", "foto-1a2b.jpg")).toBe(true);
    expect(isExtraFileName("lebenslauf", "lebenslauf-foto.jpg")).toBe(true);
    expect(isExtraFileName("lebenslauf", "lebenslauf.json")).toBe(false);
    expect(isExtraFileName("lebenslauf", "lebenslauf.backup-v1.json")).toBe(false);
    expect(isExtraFileName("lebenslauf", "foto")).toBe(false);
    expect(isExtraFileName("lebenslauf", "a/b.jpg")).toBe(false);
    expect(isExtraFileName("lebenslauf", "../zeitstrahl.json")).toBe(false);
    expect(isExtraFileName("lebenslauf", "Foto.jpg")).toBe(false);
  });
});

describe("extraFiles", () => {
  it("writes, reads and removes files in the folder of the app", async () => {
    const folder = createMemoryFolder();
    const files = extraFiles(folder, "lebenslauf");
    const photo = new Blob(["jpeg"], { type: "image/jpeg" });

    await files.write("foto-1.jpg", photo);
    expect(folder.blobs.get("lebenslauf/foto-1.jpg")).toBe(photo);
    expect(await files.read("foto-1.jpg")).toBe(photo);

    await files.remove("foto-1.jpg");
    expect(await files.read("foto-1.jpg")).toBeNull();
    await expect(files.remove("foto-1.jpg")).resolves.toBeUndefined();
  });

  it("refuses the name of the data file and names with folders", async () => {
    const folder = createMemoryFolder();
    folder.files.set("lebenslauf/lebenslauf.json", { text: "{}", lastModified: 1 });
    const files = extraFiles(folder, "lebenslauf");

    await expect(files.read("lebenslauf.json")).rejects.toThrow("kein erlaubter Dateiname");
    await expect(files.write("../x.jpg", new Blob(["x"]))).rejects.toThrow("„../x.jpg“");
    await expect(files.remove("lebenslauf.json")).rejects.toThrow("„lebenslauf“");
    expect(folder.files.has("lebenslauf/lebenslauf.json")).toBe(true);
  });

  it("fails like the folder when a write or a remove fails", async () => {
    const folder = createMemoryFolder();
    folder.writeError = new Error("Kein Zugriff");
    const files = extraFiles(folder, "lebenslauf");

    await expect(files.write("a.jpg", new Blob(["x"]))).rejects.toThrow("Kein Zugriff");
    await expect(files.remove("a.jpg")).rejects.toThrow("Kein Zugriff");
  });

  it("reads a text file of the memory folder as bytes", async () => {
    const folder = createMemoryFolder();
    folder.files.set("lebenslauf/notiz.txt", { text: "Hallo", lastModified: 1 });

    expect(await (await extraFiles(folder, "lebenslauf").read("notiz.txt"))?.text()).toBe("Hallo");
  });
});
