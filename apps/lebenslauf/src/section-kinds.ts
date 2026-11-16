import type { SectionKind } from "./schema.ts";

/** The German name and the fields of each kind of section, for the editor. */
export const SECTION_KIND_INFO: Record<SectionKind, { label: string; fields: string }> = {
  projects: { label: "Projekte", fields: "Titel, Beschreibung, Aufgaben, Tools" },
  stations: { label: "Stationen", fields: "Zeitraum, Titel, Zusatz, Stichpunkte" },
  list: { label: "Liste", fields: "Label und Werte, z. B. Sprachen" },
};
