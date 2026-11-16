import { moveById, moveTo, type Direction, type DropPosition } from "@pocket-apps/ui/drag-sort";
import {
  CONTACT_KINDS,
  type Contact,
  type LebenslaufData,
  type Person,
  type Section,
  type Variant,
} from "./schema.ts";

export function newId(): string {
  return crypto.randomUUID();
}

/** The entries of the section kind `K`. */
export type EntryOf<K extends Section["kind"]> = Extract<Section, { kind: K }>["entries"][number];

/** An entry together with the kind of its section. */
export type SavedEntry = {
  [K in Section["kind"]]: { kind: K; entry: EntryOf<K> };
}[Section["kind"]];

// Lists

/** Replaces the item with the same ID, or adds the item at the end. */
export function upsert<T extends { id: string }>(list: readonly T[], item: T): T[] {
  return list.some((entry) => entry.id === item.id)
    ? list.map((entry) => (entry.id === item.id ? item : entry))
    : [...list, item];
}

export function removeById<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((entry) => entry.id !== id);
}

// Variants

/** The active variant. */
export function activeVariant(data: LebenslaufData): Variant {
  const active = data.variants.find((variant) => variant.id === data.activeVariantId);
  if (active) return active;
  const [first] = data.variants;
  if (!first) throw new Error("The data has no variant.");
  return first;
}

export type NewVariant = Pick<Variant, "id" | "name" | "design" | "language">;

/** Adds an empty variant at the end and makes it active. */
export function addVariant(data: LebenslaufData, variant: NewVariant): LebenslaufData {
  return {
    ...data,
    variants: [...data.variants, { ...variant, photo: null, sections: [] }],
    activeVariantId: variant.id,
  };
}

/** The file name of the photo of a variant in the folder of the app (`lebenslauf/`). */
export function photoFileName(variantId: string): string {
  return `foto-${variantId}.jpg`;
}

export type CopyIds = {
  /** The ID of the copy. */
  variantId: string;
  /** Gives the new IDs of the sections and entries. */
  newId: () => string;
  /** The photo file of the copy, or `null` (the photo could not be copied). */
  photo: string | null;
};

/**
 * Copies the variant `sourceId` with all its sections, puts the copy after it and makes it
 * active. The copy and each of its sections and entries get a new ID. Keeps the data if the
 * variant does not exist (any more).
 */
export function duplicateVariant(
  data: LebenslaufData,
  sourceId: string,
  ids: CopyIds,
): LebenslaufData {
  const { newId: id } = ids;
  const original = data.variants.find((variant) => variant.id === sourceId);
  if (!original) return data;
  const copy: Variant = {
    ...original,
    id: ids.variantId,
    photo: ids.photo,
    name: `${original.name} (Kopie)`,
    sections: original.sections.map((section) =>
      changeEntries({ ...section, id: id() }, (list) =>
        list.map((entry) => ({ ...entry, id: id() })),
      ),
    ),
  };
  const index = data.variants.indexOf(original);
  return {
    ...data,
    variants: [...data.variants.slice(0, index + 1), copy, ...data.variants.slice(index + 1)],
    activeVariantId: copy.id,
  };
}

export function setActiveVariant(data: LebenslaufData, id: string): LebenslaufData {
  return data.variants.some((variant) => variant.id === id)
    ? { ...data, activeVariantId: id }
    : data;
}

/** Changes the variant with the ID `id`. Keeps the data if the variant does not exist. */
export function updateVariantById(
  data: LebenslaufData,
  id: string,
  change: (variant: Variant) => Variant,
): LebenslaufData {
  return {
    ...data,
    variants: data.variants.map((variant) => (variant.id === id ? change(variant) : variant)),
  };
}

/** Changes the active variant with `change`. */
export function updateActiveVariant(
  data: LebenslaufData,
  change: (variant: Variant) => Variant,
): LebenslaufData {
  return updateVariantById(data, activeVariant(data).id, change);
}

/** Changes the list of sections of the active variant. */
export function updateActiveSections(
  data: LebenslaufData,
  change: (sections: readonly Section[]) => Section[],
): LebenslaufData {
  return updateActiveVariant(data, (variant) => ({
    ...variant,
    sections: change(variant.sections),
  }));
}

/** Removes the active variant and activates its neighbor. Keeps the last variant. */
export function removeActiveVariant(data: LebenslaufData): LebenslaufData {
  const active = activeVariant(data);
  const index = data.variants.indexOf(active);
  const variants = removeById(data.variants, active.id);
  const next = variants[index] ?? variants[index - 1];
  return next ? { ...data, variants, activeVariantId: next.id } : data;
}

// Sections of a variant

/** Changes the section with the ID `sectionId` of a variant. */
export function updateSection(
  variant: Variant,
  sectionId: string,
  change: (section: Section) => Section,
): Variant {
  return {
    ...variant,
    sections: variant.sections.map((section) =>
      section.id === sectionId ? change(section) : section,
    ),
  };
}

/** A change of a list that keeps the type of its items. */
type ListChange = <T extends { id: string }>(list: readonly T[]) => T[];

function changeEntries(section: Section, change: ListChange): Section {
  switch (section.kind) {
    case "projects":
      return { ...section, entries: change(section.entries) };
    case "stations":
      return { ...section, entries: change(section.entries) };
    case "list":
      return { ...section, entries: change(section.entries) };
  }
}

/** Replaces or adds an entry. Keeps the section if the entry is of another kind. */
export function upsertEntry(section: Section, saved: SavedEntry): Section {
  if (section.kind === "projects" && saved.kind === "projects") {
    return { ...section, entries: upsert(section.entries, saved.entry) };
  }
  if (section.kind === "stations" && saved.kind === "stations") {
    return { ...section, entries: upsert(section.entries, saved.entry) };
  }
  if (section.kind === "list" && saved.kind === "list") {
    return { ...section, entries: upsert(section.entries, saved.entry) };
  }
  return section;
}

export function removeEntry(section: Section, entryId: string): Section {
  return changeEntries(section, (list) => removeById(list, entryId));
}

export function moveEntry(section: Section, entryId: string, direction: Direction): Section {
  return changeEntries(section, (list) => moveById(list, entryId, direction));
}

/** Moves an entry before or after another entry of the same section. */
export function dropEntry(
  section: Section,
  draggedId: string,
  targetId: string,
  position: DropPosition,
): Section {
  return changeEntries(section, (list) => moveTo(list, draggedId, targetId, position));
}

// Person

export function setName(person: Person, name: string): Person {
  return { ...person, name };
}

/** Adds an empty contact line. The kind is the first kind that the person does not have yet. */
export function addContact(person: Person, id: string): Person {
  const used = new Set(person.contacts.map((contact) => contact.kind));
  const kind = CONTACT_KINDS.find((candidate) => !used.has(candidate));
  return { ...person, contacts: [...person.contacts, { id, kind: kind ?? "website", value: "" }] };
}

export function updateContact(person: Person, contact: Contact): Person {
  return { ...person, contacts: upsert(person.contacts, contact) };
}

export function removeContact(person: Person, id: string): Person {
  return { ...person, contacts: removeById(person.contacts, id) };
}

export function moveContact(person: Person, id: string, direction: Direction): Person {
  return { ...person, contacts: moveById(person.contacts, id, direction) };
}

export function dropContact(
  person: Person,
  draggedId: string,
  targetId: string,
  position: DropPosition,
): Person {
  return { ...person, contacts: moveTo(person.contacts, draggedId, targetId, position) };
}
