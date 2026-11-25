import type { Section } from "./schema.ts";
import { formatMonth, formatRange } from "./text.ts";

/** One line per entry for the list in the editor. */
export type EntrySummary = { id: string; title: string; detail: string };

/** The lines of the entries of a section, in their order. */
export function entrySummaries(section: Section): EntrySummary[] {
  switch (section.kind) {
    case "projects":
      return section.entries.map((project) => ({
        id: project.id,
        title: project.title,
        detail: [formatRange(project.from, project.to, "seit"), project.tools.join(", ")]
          .filter((text) => text !== null && text !== "")
          .join(" · "),
      }));
    case "stations":
      return section.entries.map((station) => ({
        id: station.id,
        title: station.title,
        detail:
          station.to === null
            ? `seit ${formatMonth(station.from)}`
            : `${formatMonth(station.from)} – ${formatMonth(station.to)}`,
      }));
    case "list":
      return section.entries.map((row) => ({
        id: row.id,
        title: row.label,
        detail: row.items.join(", "),
      }));
  }
}
