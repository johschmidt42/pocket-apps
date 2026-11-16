import type { Entry, When } from "./schema.ts";

function exampleEntry(id: string, title: string, when: When, description = ""): Entry {
  return { id: `example-${id}`, title, description, when, side: "auto", visible: true };
}

/**
 * A short example CV. The app shows it only while no timeline has an entry. It is not in the data
 * file, and the user cannot change it.
 */
export const EXAMPLE_ENTRIES: readonly Entry[] = [
  exampleEntry("birth", "Geburt", { kind: "point", date: "1995-04-12" }),
  exampleEntry(
    "school",
    "Schule",
    { kind: "range", start: "2001", end: "2013" },
    "Grundschule und Gymnasium",
  ),
  exampleEntry(
    "study",
    "Studium",
    { kind: "range", start: "2013-10", end: "2018-09" },
    "Bachelor und Master in Informatik",
  ),
  exampleEntry("abroad", "Auslandssemester", { kind: "range", start: "2016-02", end: "2016-07" }),
  exampleEntry("move", "Umzug nach Berlin", { kind: "point", date: "2018-10-01" }),
  exampleEntry(
    "job",
    "Softwareentwicklerin",
    { kind: "ongoing", start: "2018-11" },
    "Erste Stelle nach dem Studium",
  ),
];
