import { describe, expect, it } from "vitest";
import { initialData, type LebenslaufData, type Section } from "./schema.ts";
import {
  activeVariant,
  addContact,
  addVariant,
  duplicateVariant,
  dropContact,
  dropEntry,
  moveById,
  moveContact,
  moveTo,
  photoFileName,
  moveEntry,
  removeActiveVariant,
  removeContact,
  removeEntry,
  setActiveVariant,
  setName,
  updateActiveVariant,
  updateContact,
  updateVariantById,
  updateSection,
  upsert,
  upsertEntry,
} from "./variants.ts";

const LIST: Section = {
  id: "skills",
  title: "Skills",
  kind: "list",
  entries: [
    { id: "a", label: "Languages", items: ["German"] },
    { id: "b", label: "Tools", items: ["Git"] },
  ],
};

const PROJECTS: Section = {
  id: "projects",
  title: "Projects",
  kind: "projects",
  entries: [{ id: "p", title: "Shop", description: "", tasks: [], tools: [] }],
};

const STATIONS: Section = {
  id: "work",
  title: "Work",
  kind: "stations",
  entries: [{ id: "s", from: "2020-01", to: null, title: "Job", subtitle: "", bullets: [] }],
};

/** Data with the variants "one" (active) and "two". */
function twoVariants(): LebenslaufData {
  return addVariant(setActiveVariant(initialData("one"), "one"), {
    id: "two",
    name: "Firma X",
    design: "klassisch",
    language: "en",
  });
}

describe("lists", () => {
  it("replaces or adds an item", () => {
    expect(upsert([{ id: "a", n: 1 }], { id: "a", n: 2 })).toEqual([{ id: "a", n: 2 }]);
    expect(upsert([{ id: "a", n: 1 }], { id: "b", n: 2 })).toHaveLength(2);
  });

  it("moves an item and keeps the list at the edges", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(moveById(list, "b", -1).map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moveById(list, "b", 1).map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(moveById(list, "a", -1)).toEqual(list);
    expect(moveById(list, "c", 1)).toEqual(list);
    expect(moveById(list, "x", 1)).toEqual(list);
  });
});

describe("moveTo", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  it("puts the dragged item before or after the target", () => {
    expect(ids(moveTo(list, "c", "a", "before"))).toEqual(["c", "a", "b"]);
    expect(ids(moveTo(list, "a", "b", "after"))).toEqual(["b", "a", "c"]);
    expect(ids(moveTo(list, "a", "c", "after"))).toEqual(["b", "c", "a"]);
  });

  it("keeps the list for a missing or the same ID", () => {
    expect(moveTo(list, "x", "a", "before")).toEqual(list);
    expect(moveTo(list, "a", "x", "before")).toEqual(list);
    expect(moveTo(list, "a", "a", "after")).toEqual(list);
  });
});

describe("variants", () => {
  it("names the photo file after the variant and changes a variant by its ID", () => {
    const data = twoVariants();

    expect(photoFileName("a1")).toBe("foto-a1.jpg");
    const changed = updateVariantById(data, "one", (variant) => ({ ...variant, photo: "x.jpg" }));
    expect(changed.variants.map((variant) => variant.photo)).toEqual(["x.jpg", null]);
  });

  it("adds an empty variant and makes it active", () => {
    const data = twoVariants();

    expect(activeVariant(data)).toMatchObject({ id: "two", name: "Firma X", sections: [] });
    expect(activeVariant(setActiveVariant(data, "one")).id).toBe("one");
    expect(setActiveVariant(data, "missing")).toBe(data);
  });

  it("takes the first variant if the active ID is missing", () => {
    expect(activeVariant({ ...twoVariants(), activeVariantId: "x" }).id).toBe("one");
    expect(() => activeVariant({ ...initialData("a"), variants: [] })).toThrow();
  });

  it("copies the active variant after it", () => {
    let data = updateActiveVariant(setActiveVariant(twoVariants(), "one"), (variant) => ({
      ...variant,
      sections: [LIST],
    }));

    let next = 1;
    expect(
      duplicateVariant(data, "missing", { variantId: "x", newId: () => "y", photo: null }),
    ).toBe(data);
    data = duplicateVariant(data, "one", {
      variantId: "new1",
      newId: () => `new${String(++next)}`,
      photo: "foto-new1.jpg",
    });

    expect(data.variants.map((variant) => variant.id)).toEqual(["one", "new1", "two"]);
    const copy = activeVariant(data);
    expect(copy.name).toBe("Mein Lebenslauf (Kopie)");
    expect(copy.photo).toBe("foto-new1.jpg");
    // Same content, new IDs.
    expect(copy.sections).toEqual([
      {
        ...LIST,
        id: "new2",
        entries: LIST.entries.map((entry, index) => ({ ...entry, id: `new${String(index + 3)}` })),
      },
    ]);
  });

  it("removes the active variant and keeps the last one", () => {
    const data = removeActiveVariant(setActiveVariant(twoVariants(), "one"));

    expect(data.variants.map((variant) => variant.id)).toEqual(["two"]);
    expect(data.activeVariantId).toBe("two");
    expect(removeActiveVariant(data)).toBe(data);
    expect(removeActiveVariant(twoVariants()).activeVariantId).toBe("one");
  });
});

describe("sections and entries", () => {
  it("changes only the section with the ID", () => {
    const variant = { ...activeVariant(initialData("v")), sections: [LIST, PROJECTS] };

    const changed = updateSection(variant, "projects", (section) => ({ ...section, title: "P" }));

    expect(changed.sections.map((section) => section.title)).toEqual(["Skills", "P"]);
  });

  it("adds, replaces, moves and removes entries of each kind", () => {
    const row = { id: "c", label: "Hobbys", items: [] };
    expect(upsertEntry(LIST, { kind: "list", entry: row }).entries).toHaveLength(3);

    const project = { id: "p", title: "Shop 2", description: "", tasks: [], tools: [] };
    expect(upsertEntry(PROJECTS, { kind: "projects", entry: project }).entries).toEqual([project]);

    const station = { ...STATIONS.entries[0]!, title: "Job 2" };
    expect(upsertEntry(STATIONS, { kind: "stations", entry: station }).entries).toEqual([station]);

    // An entry of another kind does not fit.
    expect(upsertEntry(LIST, { kind: "projects", entry: project })).toBe(LIST);

    expect(moveEntry(LIST, "b", -1).entries.map((entry) => entry.id)).toEqual(["b", "a"]);
    expect(removeEntry(LIST, "a").entries.map((entry) => entry.id)).toEqual(["b"]);
    expect(dropEntry(LIST, "b", "a", "before").entries.map((entry) => entry.id)).toEqual([
      "b",
      "a",
    ]);
    expect(removeEntry(PROJECTS, "p").entries).toEqual([]);
    expect(removeEntry(STATIONS, "s").entries).toEqual([]);
  });
});

describe("person", () => {
  it("adds contact lines with the next free kind", () => {
    let person = setName({ name: "", contacts: [] }, "Erika");
    for (const id of ["1", "2", "3", "4", "5", "6", "7"]) person = addContact(person, id);

    expect(person.name).toBe("Erika");
    expect(person.contacts.map((contact) => contact.kind)).toEqual([
      "email",
      "website",
      "linkedin",
      "github",
      "phone",
      "location",
      "website",
    ]);
  });

  it("changes, moves and removes a contact line", () => {
    let person = addContact(addContact({ name: "", contacts: [] }, "1"), "2");

    person = updateContact(person, { id: "1", kind: "phone", value: "123" });
    person = moveContact(person, "2", -1);

    expect(person.contacts.map((contact) => contact.id)).toEqual(["2", "1"]);
    expect(person.contacts[1]).toEqual({ id: "1", kind: "phone", value: "123" });
    expect(removeContact(person, "2").contacts.map((contact) => contact.id)).toEqual(["1"]);
    expect(dropContact(person, "2", "1", "after").contacts.map((contact) => contact.id)).toEqual([
      "1",
      "2",
    ]);
  });
});
