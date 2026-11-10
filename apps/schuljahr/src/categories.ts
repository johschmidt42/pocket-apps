import type { Holiday } from "./schema.ts";

/** The kinds of free days, in the order of the school year. This is also the order of the colors. */
export const CATEGORIES = [
  "herbst",
  "weihnachten",
  "winter",
  "ostern",
  "pfingsten",
  "sommer",
  "frei",
  "feiertag",
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Each kind has one fixed chart color. `dayClass` colors a day in the calendar.
 * `dotClass` colors the dot in the legend and in the list.
 */
export const CATEGORY_INFO: Record<
  Category,
  { label: string; dayClass: string; dotClass: string }
> = {
  herbst: { label: "Herbstferien", dayClass: "bg-chart-1/30", dotClass: "bg-chart-1" },
  weihnachten: { label: "Weihnachtsferien", dayClass: "bg-chart-2/30", dotClass: "bg-chart-2" },
  winter: {
    label: "Winter- und Frühjahrsferien",
    dayClass: "bg-chart-3/30",
    dotClass: "bg-chart-3",
  },
  ostern: { label: "Osterferien", dayClass: "bg-chart-4/30", dotClass: "bg-chart-4" },
  pfingsten: { label: "Pfingstferien", dayClass: "bg-chart-5/30", dotClass: "bg-chart-5" },
  sommer: { label: "Sommerferien", dayClass: "bg-chart-6/30", dotClass: "bg-chart-6" },
  frei: { label: "Weitere freie Tage", dayClass: "bg-chart-7/30", dotClass: "bg-chart-7" },
  feiertag: {
    label: "Feiertage",
    // A ring, because the color is close to the Christmas holidays.
    dayClass: "bg-chart-8/30 ring-1 ring-chart-8 ring-inset",
    dotClass: "bg-chart-8",
  },
};

/** Words in the names of OpenHolidays, for example "Halbjahresferien" or "Fastnachtsferien". */
const NAME_PARTS: readonly [Category, readonly string[]][] = [
  ["herbst", ["Herbst"]],
  ["weihnachten", ["Weihnacht"]],
  ["winter", ["Winter", "Halbjahr", "Frühjahr", "Fastnacht", "Fasching"]],
  ["ostern", ["Oster"]],
  ["pfingsten", ["Pfingst"]],
  ["sommer", ["Sommer"]],
];

/** The kind of a holiday. Single free days (for example "Buß- und Bettag") are "frei". */
export function categoryOf(holiday: Pick<Holiday, "kind" | "name">): Category {
  if (holiday.kind === "public") return "feiertag";
  const match = NAME_PARTS.find(([, parts]) => parts.some((part) => holiday.name.includes(part)));
  return match ? match[0] : "frei";
}
