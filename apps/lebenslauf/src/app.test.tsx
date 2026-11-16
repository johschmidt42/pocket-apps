import { createMemoryFolder, createMemoryFolderHost } from "@pocket-apps/core/data-file/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import { PhotoError } from "./photo.ts";
import type { LebenslaufData } from "./schema.ts";

const FILE = "lebenslauf/lebenslauf.json";

const DATA: LebenslaufData = {
  person: {
    name: "Erika Mustermann",
    contacts: [
      { id: "c1", kind: "email", value: "erika@example.com" },
      { id: "c2", kind: "location", value: "Köln" },
    ],
  },
  activeVariantId: "v1",
  variants: [
    {
      id: "v1",
      name: "Standard",
      design: "klassisch",
      language: "en",
      photo: null,
      sections: [
        {
          id: "work",
          title: "Work History",
          kind: "stations",
          entries: [
            {
              id: "s1",
              from: "2024-01",
              to: null,
              title: "Freelancer",
              subtitle: "Software",
              bullets: [],
            },
            {
              id: "s2",
              from: "2021-03",
              to: "2023-12",
              title: "Data Engineer",
              subtitle: "Beispiel GmbH",
              bullets: ["Pipelines"],
            },
          ],
        },
        {
          id: "skills",
          title: "Skills",
          kind: "list",
          entries: [{ id: "l1", label: "Languages", items: ["German", "English"] }],
        },
      ],
    },
    { id: "v2", name: "Firma X", design: "klassisch", language: "de", photo: null, sections: [] },
  ],
};

/** A fake for the canvas work (jsdom has no canvas): it marks the bytes as prepared. */
async function fakePreparePhoto(file: Blob): Promise<Blob> {
  const text = await file.text();
  if (text === "kaputt") throw new PhotoError("Die Datei ist kein Bild.");
  return new Blob([`klein:${text}`], { type: "image/jpeg" });
}

async function openApp(data?: LebenslaufData) {
  const folder = createMemoryFolder();
  if (data) {
    folder.files.set(FILE, {
      text: JSON.stringify({
        app: "lebenslauf",
        schemaVersion: 1,
        savedWith: "1.0",
        savedAt: "2026-11-16T10:00:00.000Z",
        data,
      }),
      lastModified: 1,
    });
  }
  const user = userEvent.setup();
  render(
    <App folderHost={createMemoryFolderHost({ saved: folder })} preparePhoto={fakePreparePhoto} />,
  );
  await screen.findByRole("button", { name: "Abschnitt hinzufügen" });
  return { folder, user };
}

function savedData(folder: ReturnType<typeof createMemoryFolder>): LebenslaufData {
  return (JSON.parse(folder.files.get(FILE)?.text ?? "") as { data: LebenslaufData }).data;
}

async function saved(folder: ReturnType<typeof createMemoryFolder>): Promise<LebenslaufData> {
  await screen.findByText("Gespeichert");
  return savedData(folder);
}

function frame(): HTMLIFrameElement {
  return screen.getByTitle<HTMLIFrameElement>("Vorschau des Lebenslaufs");
}

/** The CV in the preview frame. */
function cv() {
  return within(frame().contentDocument!.body);
}

/** The text of the tools in the CV, for example "Python | Docker". */
function toolsText(text: string) {
  return cv().getByText((_, element) => element?.tagName === "DD" && element.textContent === text);
}

function editButton(title: RegExp) {
  return screen.getByRole("button", { name: title });
}

async function addSection(user: UserEvent, title: string, kind: string) {
  await user.click(screen.getByRole("button", { name: "Abschnitt hinzufügen" }));
  await user.type(screen.getByLabelText("Überschrift"), title);
  await user.selectOptions(screen.getByLabelText("Art der Einträge"), kind);
  await user.click(screen.getByRole("button", { name: "Speichern" }));
}

describe("Lebenslauf", () => {
  it("needs Chrome or Edge for the data folder", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Bitte Chrome oder Edge verwenden" }),
    ).toBeInTheDocument();
  });

  it("starts empty and loads the example into the preview", async () => {
    const { folder, user } = await openApp();

    expect(screen.getByRole("heading", { level: 3, name: "Noch keine Abschnitte" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Beispiel laden" }));

    expect(screen.getByRole("heading", { level: 3, name: "Projects" })).toBeVisible();
    expect(cv().getByRole("heading", { level: 2, name: "Projects" })).toBeInTheDocument();
    expect(toolsText("Python | FastAPI | PostgreSQL | Docker | GitHub Actions")).toBeTruthy();
    expect(cv().getAllByText("Beschreibung")).toHaveLength(2);
    expect(cv().getByText("Seit 01/2024")).toBeTruthy();
    // Vitest does not load CSS. e2e/lebenslauf.spec.ts checks the styles of the design.
    expect((await saved(folder)).variants[0]?.sections).toHaveLength(4);
  });

  it("shows the name and the contact lines in all variants", async () => {
    const { folder, user } = await openApp();

    await user.type(screen.getByLabelText("Name"), "Erika Mustermann");
    await user.click(screen.getByRole("button", { name: "Kontaktzeile hinzufügen" }));
    expect(screen.getByLabelText("E-Mail")).toHaveFocus();
    await user.keyboard("erika@example.com");
    await user.click(screen.getByRole("button", { name: "Kontaktzeile hinzufügen" }));
    await user.type(screen.getByLabelText("Website"), "erika.de");
    await user.selectOptions(screen.getAllByLabelText("Art der Kontaktzeile")[1]!, "location");
    await user.click(screen.getByRole("button", { name: "Ort verschieben" }));
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: "Ort verschieben" })).toHaveFocus();

    expect(cv().getByRole("heading", { level: 1, name: "Erika Mustermann" })).toBeInTheDocument();
    expect(cv().getByRole("link", { name: "erika@example.com" })).toHaveAttribute(
      "href",
      "mailto:erika@example.com",
    );
    expect(cv().queryByRole("link", { name: "erika.de" })).not.toBeInTheDocument();
    expect(cv().getByText("erika.de")).toBeTruthy();
    expect((await saved(folder)).person).toMatchObject({
      name: "Erika Mustermann",
      contacts: [
        { kind: "location", value: "erika.de" },
        { kind: "email", value: "erika@example.com" },
      ],
    });

    await user.click(screen.getByRole("button", { name: "Ort verschieben" }));
    await user.keyboard("{ArrowDown}");
    await user.click(screen.getByRole("button", { name: "E-Mail löschen" }));

    expect(screen.getByRole("button", { name: "Kontaktzeile hinzufügen" })).toHaveFocus();
    expect((await saved(folder)).person.contacts.map((contact) => contact.kind)).toEqual([
      "location",
    ]);
  });

  it("adds a section of projects with a project", async () => {
    const { folder, user } = await openApp();

    await addSection(user, "Projekte", "projects");
    await user.click(screen.getByRole("button", { name: "Eintrag hinzufügen" }));
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("Bitte einen Titel eingeben.")).toBeVisible();

    await user.type(screen.getByLabelText("Titel"), "Shop");
    await user.type(screen.getByLabelText("Beschreibung"), "Ein Online-Shop");
    await user.type(screen.getByLabelText("Aufgaben"), "APIs{Enter}{Enter}Tests");
    await user.type(screen.getByLabelText("Tools"), "Python | Docker");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(cv().getByRole("heading", { level: 3, name: "Shop" })).toBeInTheDocument();
    expect(toolsText("Python | Docker")).toBeTruthy();
    expect(
      cv()
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["APIs", "Tests"]);
    const [section] = (await saved(folder)).variants[0]!.sections;
    expect(section).toMatchObject({
      title: "Projekte",
      kind: "projects",
      entries: [
        {
          title: "Shop",
          description: "Ein Online-Shop",
          tasks: ["APIs", "Tests"],
          tools: ["Python", "Docker"],
        },
      ],
    });

    await user.click(editButton(/^Shop/));
    expect(screen.getByLabelText("Tools")).toHaveValue("Python\nDocker");
    await user.clear(screen.getByLabelText("Titel"));
    await user.type(screen.getByLabelText("Titel"), "Shop 2");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(cv().getByRole("heading", { level: 3, name: "Shop 2" })).toBeInTheDocument();
  });

  it("checks the dates of a station and shows it in the language of the variant", async () => {
    const { folder, user } = await openApp();

    await addSection(user, "Berufserfahrung", "stations");
    await user.click(screen.getByRole("button", { name: "Eintrag hinzufügen" }));
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("Bitte einen Monat eingeben.")).toBeVisible();
    expect(screen.getByText("Bitte einen Monat eingeben, oder „bis heute“ wählen.")).toBeVisible();
    expect(screen.getByText("Bitte einen Titel eingeben.")).toBeVisible();

    await user.type(screen.getByLabelText("Von"), "2021-03");
    await user.type(screen.getByLabelText("Bis"), "2020-01");
    await user.type(screen.getByLabelText("Titel"), "Data Engineer");
    await user.type(screen.getByLabelText("Zusatz"), "Beispiel GmbH");
    await user.type(screen.getByLabelText("Stichpunkte"), "Pipelines");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("Das Ende darf nicht vor dem Start liegen.")).toBeVisible();

    await user.click(screen.getByLabelText(/Bis heute/));
    expect(screen.getByLabelText("Bis")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(cv().getByText("Seit 03/2021")).toBeTruthy();
    expect(cv().getByText("Beispiel GmbH", { exact: false })).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "Englisch" }));
    expect(cv().getByText("Since 03/2021")).toBeTruthy();
    expect(frame().contentDocument!.documentElement.lang).toBe("en");
    expect((await saved(folder)).variants[0]).toMatchObject({
      language: "en",
      sections: [{ entries: [{ from: "2021-03", to: null, bullets: ["Pipelines"] }] }],
    });

    await user.click(editButton(/^Data Engineer/));
    expect(screen.getByLabelText(/Bis heute/)).toBeChecked();
    await user.click(screen.getByLabelText(/Bis heute/));
    await user.type(screen.getByLabelText("Bis"), "2023-12");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(cv().getByText(/03\/2021 –/)).toHaveTextContent("03/2021 –12/2023");
  });

  it("adds a list row", async () => {
    const { user } = await openApp();

    await addSection(user, "Skills", "list");
    await user.click(screen.getByRole("button", { name: "Eintrag hinzufügen" }));
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByText("Bitte ein Label eingeben.")).toBeVisible();
    await user.type(screen.getByLabelText("Label"), "Sprachen");
    await user.type(screen.getByLabelText("Werte"), "Deutsch{Enter}Englisch");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(cv().getByText("Sprachen")).toBeTruthy();
    expect(cv().getByText("Englisch")).toBeTruthy();
    expect(screen.getByText("Deutsch, Englisch")).toBeVisible();
  });

  it("renames, moves and removes sections and entries", async () => {
    const { folder, user } = await openApp(DATA);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "„Data Engineer“ verschieben" }));
    await user.keyboard("{ArrowUp}");
    await user.click(screen.getByRole("button", { name: "Abschnitt „Skills“ verschieben" }));
    await user.keyboard("{ArrowUp}");
    await user.click(screen.getByRole("button", { name: "Skills" }));
    expect(screen.getByLabelText("Überschrift des Abschnitts")).toHaveFocus();
    await user.keyboard("Kenntnisse{Enter}");
    expect(screen.getByRole("button", { name: "Kenntnisse" })).toHaveFocus();

    expect(
      cv()
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Kenntnisse", "Work History"]);
    let variant = (await saved(folder)).variants[0]!;
    expect(variant.sections[1]?.entries.map((entry) => entry.id)).toEqual(["s2", "s1"]);

    await user.click(screen.getByRole("button", { name: "„Freelancer“ löschen" }));
    expect(screen.getAllByRole("button", { name: "Eintrag hinzufügen" })[1]).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Abschnitt „Kenntnisse“ löschen" }));
    expect(screen.getByRole("button", { name: "Abschnitt hinzufügen" })).toHaveFocus();

    await waitFor(() => {
      variant = savedData(folder).variants[0]!;
      expect(variant.sections.map((section) => section.title)).toEqual(["Work History"]);
    });
    expect(variant.sections[0]?.entries.map((entry) => entry.id)).toEqual(["s2"]);
  });

  it("renames a section in place: Escape and an empty title keep the old title", async () => {
    const { folder, user } = await openApp(DATA);

    await user.click(screen.getByRole("button", { name: "Skills" }));
    await user.keyboard("Hobbys{Escape}");
    expect(screen.getByRole("button", { name: "Skills" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Skills" }));
    await user.clear(screen.getByLabelText("Überschrift des Abschnitts"));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { level: 3, name: "Skills" })).toBeVisible();

    // A click outside the text field saves.
    await user.click(screen.getByRole("button", { name: "Skills" }));
    await user.keyboard("Kenntnisse");
    await user.click(screen.getByRole("heading", { level: 2, name: "Abschnitte" }));
    expect(screen.getByRole("heading", { level: 3, name: "Kenntnisse" })).toBeVisible();
    expect(cv().getByRole("heading", { level: 2, name: "Kenntnisse" })).toBeInTheDocument();
    expect((await saved(folder)).variants[0]?.sections[1]?.title).toBe("Kenntnisse");
  });

  it("keeps one photo per variant in its own file of the data folder", async () => {
    const { folder, user } = await openApp(DATA);
    const photoFile = "foto-v1.jpg";
    const pick = (text: string) =>
      user.upload(
        screen.getByLabelText("Foto-Datei"),
        new File([text], "foto.png", { type: "image/png" }),
      );

    // An image that the browser cannot read gives a message.
    await pick("kaputt");
    expect(await screen.findByText("Die Datei ist kein Bild.")).toBeVisible();

    await pick("bild");
    expect(await screen.findByRole("img", { name: "Foto dieser Variante" })).toBeVisible();
    expect(await folder.blobs.get(`lebenslauf/${photoFile}`)?.text()).toBe("klein:bild");
    expect(cv().getByRole("img", { name: "Foto" })).toHaveAttribute(
      "src",
      `data:image/jpeg;base64,${btoa("klein:bild")}`,
    );
    expect((await saved(folder)).variants[0]?.photo).toBe(photoFile);

    // A new photo replaces the file under the same name, and the preview shows it.
    await pick("neu");
    await waitFor(() => {
      expect(cv().getByRole("img", { name: "Foto" })).toHaveAttribute(
        "src",
        `data:image/jpeg;base64,${btoa("klein:neu")}`,
      );
    });

    // The copy of the variant gets its own photo file.
    await user.click(screen.getByRole("button", { name: "Duplizieren" }));
    await screen.findByRole("option", { name: /Standard \(Kopie\)/, selected: true });
    const copy = (await saved(folder)).variants[1]!;
    expect(copy.photo).toBe(`foto-${copy.id}.jpg`);
    expect(await folder.blobs.get(`lebenslauf/${copy.photo!}`)?.text()).toBe("klein:neu");

    // Deleting the copy deletes its photo file.
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Variante löschen" }));
    await waitFor(() => {
      expect(folder.blobs.has(`lebenslauf/${copy.photo!}`)).toBe(false);
    });

    await user.selectOptions(screen.getByLabelText("Variante"), "v1");
    await user.click(screen.getByRole("button", { name: "Foto entfernen" }));
    expect(await screen.findByRole("button", { name: "Foto wählen …" })).toBeVisible();
    expect(folder.blobs.has(`lebenslauf/${photoFile}`)).toBe(false);
    expect(cv().queryByRole("img", { name: "Foto" })).not.toBeInTheDocument();
    expect((await saved(folder)).variants[0]?.photo).toBeNull();
  });

  it("explains a photo that cannot be saved", async () => {
    const { folder, user } = await openApp(DATA);
    folder.writeError = new Error("Kein Platz");

    await user.upload(
      screen.getByLabelText("Foto-Datei"),
      new File(["bild"], "foto.png", { type: "image/png" }),
    );

    // The English text of the browser error does not show. The app shows its own message.
    expect(
      await screen.findByText("Das Foto konnte nicht im Datenordner gespeichert werden."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Foto wählen …" })).toBeEnabled();
  });

  it("explains a photo that cannot be deleted and keeps it", async () => {
    const { folder, user } = await openApp({
      ...DATA,
      variants: [{ ...DATA.variants[0]!, photo: "foto-v1.jpg" }, DATA.variants[1]!],
    });
    folder.blobs.set("lebenslauf/foto-v1.jpg", new Blob(["bild"]));
    folder.writeError = new Error("Kein Zugriff");

    await user.click(screen.getByRole("button", { name: "Foto entfernen" }));

    expect(await screen.findByText("Das Foto konnte nicht gelöscht werden.")).toBeVisible();
    expect(folder.blobs.has("lebenslauf/foto-v1.jpg")).toBe(true);
    expect(screen.getByRole("button", { name: "Foto entfernen" })).toBeVisible();
  });

  it("copies a variant without a photo when the photo file is missing", async () => {
    const { user } = await openApp({
      ...DATA,
      variants: [{ ...DATA.variants[0]!, photo: "foto-v1.jpg" }, DATA.variants[1]!],
    });

    await user.click(screen.getByRole("button", { name: "Duplizieren" }));

    expect(
      await screen.findByText("Die Kopie hat kein Foto: Die Fotodatei fehlt im Datenordner."),
    ).toBeVisible();
  });

  it("copies a variant without its photo when the photo cannot be copied", async () => {
    const { folder, user } = await openApp({
      ...DATA,
      variants: [{ ...DATA.variants[0]!, photo: "foto-v1.jpg" }, DATA.variants[1]!],
    });
    folder.blobs.set("lebenslauf/foto-v1.jpg", new Blob(["bild"]));
    folder.writeError = new Error("Kein Platz");

    await user.click(screen.getByRole("button", { name: "Duplizieren" }));

    expect(
      await screen.findByText("Die Kopie hat kein Foto: Das Foto konnte nicht kopiert werden."),
    ).toBeVisible();
    expect(screen.getByRole("option", { name: /Standard \(Kopie\)/, selected: true })).toBeTruthy();
  });

  it("shows the projects of the example in the design modern", async () => {
    const { user } = await openApp();
    await user.click(screen.getByRole("button", { name: "Beispiel laden" }));

    await user.selectOptions(screen.getByLabelText("Design"), "modern");

    expect(cv().getByRole("heading", { level: 3, name: "Order Analytics Platform" })).toBeTruthy();
    expect(
      within(cv().getAllByRole("list", { name: "Tools" })[0]!)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Python", "FastAPI", "PostgreSQL", "Docker", "GitHub Actions"]);
    expect(cv().getByText("Developing REST APIs with FastAPI")).toBeTruthy();
    expect(cv().getByText("Master thesis: Image segmentation with neural networks")).toBeTruthy();
  });

  it("switches the design of a variant and keeps its content", async () => {
    const { folder, user } = await openApp(DATA);

    await user.selectOptions(screen.getByLabelText("Design"), "modern");

    expect(screen.getByLabelText("Variante")).toHaveDisplayValue("Standard · Modern");
    // The design splits the name and the section titles into parts (for their colors).
    expect(
      cv()
        .getAllByRole("heading")
        .map((heading) => heading.textContent),
    ).toEqual([
      "Erika Mustermann",
      "Work History",
      "Freelancer",
      "Data Engineer",
      "Skills",
      "Languages",
    ]);
    expect(cv().getByText("Since 01/2024")).toBeTruthy();
    expect((await saved(folder)).variants[0]).toMatchObject({
      design: "modern",
      sections: DATA.variants[0]!.sections,
    });
    const envelope = JSON.parse(folder.files.get(FILE)?.text ?? "") as { schemaVersion: number };
    expect(envelope.schemaVersion).toBe(2);
    // The file of version 1 stays as a backup.
    expect(folder.files.has("lebenslauf/lebenslauf.backup-v1.json")).toBe(true);
  });

  it("keeps a section if the user cancels the question", async () => {
    const { user } = await openApp(DATA);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Abschnitt „Skills“ löschen" }));
    await user.click(screen.getByRole("button", { name: "Variante löschen" }));

    expect(screen.getByRole("heading", { level: 3, name: "Skills" })).toBeVisible();
    expect(screen.getByLabelText("Variante")).toHaveValue("v1");
  });

  it("adds, copies, renames, selects and removes variants", async () => {
    const { folder, user } = await openApp(DATA);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Duplizieren" }));
    expect(screen.getByRole("heading", { level: 3, name: "Skills" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Variante umbenennen" }));
    await user.clear(screen.getByLabelText("Name der Variante"));
    await user.type(screen.getByLabelText("Name der Variante"), "Firma Y");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await user.click(screen.getByRole("button", { name: "Neue Variante" }));
    await user.type(screen.getByLabelText("Name der Variante"), "Leer");
    await user.selectOptions(screen.getByLabelText("Sprache"), "en");
    await user.selectOptions(
      within(screen.getByRole("dialog")).getByLabelText("Design"),
      "klassisch",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));
    expect(screen.getByRole("heading", { level: 3, name: "Noch keine Abschnitte" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Englisch" })).toBeChecked();

    let data = await saved(folder);
    expect(data.variants.map((variant) => variant.name)).toEqual([
      "Standard",
      "Firma Y",
      "Firma X",
      "Leer",
    ]);
    expect(data.variants[1]?.sections.map((section) => section.title)).toEqual(
      data.variants[0]?.sections.map((section) => section.title),
    );
    expect(data.variants[1]?.sections[0]?.id).not.toBe(data.variants[0]?.sections[0]?.id);

    await user.click(screen.getByRole("button", { name: "Variante löschen" }));
    expect(screen.getByLabelText("Variante")).toHaveFocus();
    await user.selectOptions(screen.getByLabelText("Variante"), "v1");
    expect(screen.getByRole("heading", { level: 3, name: "Skills" })).toBeVisible();

    await waitFor(() => {
      data = savedData(folder);
      expect(data.variants.map((variant) => variant.name)).toEqual([
        "Standard",
        "Firma Y",
        "Firma X",
      ]);
    });
    expect(data.activeVariantId).toBe("v1");
  });

  it("closes the dialogs without a change", async () => {
    const { user } = await openApp(DATA);

    await user.click(screen.getByRole("button", { name: "Neue Variante" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Variante umbenennen" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Abschnitt hinzufügen" }));
    await user.keyboard("{Escape}");
    await user.click(editButton(/^Freelancer/));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Variante")).toHaveValue("v1");
  });

  it("prints only the preview frame", async () => {
    const { user } = await openApp(DATA);
    const print = vi.fn();
    vi.spyOn(frame().contentWindow!, "print").mockImplementation(print);

    await user.click(screen.getByRole("button", { name: "Drucken / PDF" }));

    expect(print).toHaveBeenCalledOnce();
    // The preview is shown, also in a narrow window. Chrome prints a hidden frame empty.
    expect(screen.getByRole("radio", { name: "Vorschau" })).toBeChecked();
    expect(frame().contentDocument!.title).toBe("Lebenslauf Erika Mustermann");
  });

  it("switches between the editor and the preview on small screens", async () => {
    const { user } = await openApp(DATA);

    await user.click(screen.getByRole("radio", { name: "Vorschau" }));
    expect(screen.getByRole("radio", { name: "Vorschau" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Bearbeiten" }));
    expect(screen.getByRole("radio", { name: "Bearbeiten" })).toBeChecked();
  });
});
