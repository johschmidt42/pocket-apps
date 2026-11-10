import type { LoadResult } from "./open-holidays.ts";
import type { Selection } from "./schema.ts";
import { schoolYearLabel } from "./school-years.ts";
import { stateName } from "./states.ts";

/** The German message for a failed load. */
export function loadMessage(
  result: Exclude<LoadResult, { kind: "ok" }>,
  selection: Selection,
): string {
  switch (result.kind) {
    case "offline":
      return "Keine Verbindung zum Internet. Die Ferien sind nicht geladen. Versuche es später noch einmal.";
    case "failed":
      return "OpenHolidays hat nicht richtig geantwortet. Die Ferien sind nicht geladen. Versuche es später noch einmal.";
    case "empty":
      return `Für ${stateName(selection.state)} gibt es für das Schuljahr ${schoolYearLabel(selection.startYear)} noch keine Ferientermine.`;
  }
}
