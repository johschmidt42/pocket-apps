// Answers of OpenHolidays for Bayern, school year 2026/27 (loaded on 2026-11-10, shortened IDs).
import type { FetchJson, FetchResult } from "@pocket-apps/core/fetch-json";
import { parseHolidays } from "./open-holidays.ts";
import type { SchoolYear } from "./schema.ts";
import type { StateCode } from "./states.ts";

export const SCHOOL_ANSWER: unknown = [
  {
    id: "7451c518",
    startDate: "2026-08-03",
    endDate: "2026-09-14",
    name: [{ language: "DE", text: "Sommerferien" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY" }],
  },
  {
    id: "b5045dcf",
    startDate: "2026-11-02",
    endDate: "2026-11-06",
    name: [{ language: "DE", text: "Herbstferien" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY" }],
  },
  {
    id: "76149977",
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    name: [{ language: "DE", text: "Buß- und Bettag" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY" }],
  },
  {
    id: "c38a3f7c",
    startDate: "2026-12-24",
    endDate: "2027-01-08",
    name: [{ language: "DE", text: "Weihnachtsferien" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY" }],
  },
  {
    id: "37821c22",
    startDate: "2027-02-08",
    endDate: "2027-02-12",
    name: [{ language: "DE", text: "Frühjahrsferien" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY" }],
  },
  {
    id: "843e9ad1",
    startDate: "2027-03-22",
    endDate: "2027-04-02",
    name: [{ language: "DE", text: "Osterferien" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY" }],
  },
  {
    id: "1e397cac",
    startDate: "2027-05-18",
    endDate: "2027-05-28",
    name: [{ language: "DE", text: "Pfingstferien" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY" }],
  },
  {
    id: "f89e2b94",
    startDate: "2027-08-02",
    endDate: "2027-09-13",
    name: [{ language: "DE", text: "Sommerferien" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY" }],
  },
];

export const PUBLIC_ANSWER: unknown = [
  {
    id: "bea65880",
    startDate: "2026-08-08",
    endDate: "2026-08-08",
    name: [{ language: "DE", text: "Friedensfest" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY-AU" }],
  },
  {
    id: "31eed1b5",
    startDate: "2026-08-15",
    endDate: "2026-08-15",
    name: [{ language: "DE", text: "Mariä Himmelfahrt" }],
    nationwide: false,
    subdivisions: [{ code: "DE-SL" }, { code: "DE-BY" }],
  },
  {
    id: "555eaa64",
    startDate: "2026-10-03",
    endDate: "2026-10-03",
    name: [{ language: "DE", text: "Tag der Deutschen Einheit" }],
    nationwide: true,
  },
  {
    id: "c359d742",
    startDate: "2026-11-01",
    endDate: "2026-11-01",
    name: [{ language: "DE", text: "Allerheiligen" }],
    nationwide: false,
    subdivisions: [
      { code: "DE-SL" },
      { code: "DE-NW" },
      { code: "DE-BW" },
      { code: "DE-RP" },
      { code: "DE-BY" },
    ],
  },
  {
    id: "b37c8536",
    startDate: "2026-12-25",
    endDate: "2026-12-25",
    name: [{ language: "DE", text: "1. Weihnachtsfeiertag" }],
    nationwide: true,
  },
  {
    id: "fafc28cf",
    startDate: "2026-12-26",
    endDate: "2026-12-26",
    name: [{ language: "DE", text: "2. Weihnachtsfeiertag" }],
    nationwide: true,
  },
  {
    id: "a9951b88",
    startDate: "2027-01-01",
    endDate: "2027-01-01",
    name: [{ language: "DE", text: "Neujahr" }],
    nationwide: true,
  },
  {
    id: "341c9738",
    startDate: "2027-01-06",
    endDate: "2027-01-06",
    name: [{ language: "DE", text: "Heilige Drei Könige" }],
    nationwide: false,
    subdivisions: [{ code: "DE-ST" }, { code: "DE-BW" }, { code: "DE-BY" }],
  },
  {
    id: "f5967e35",
    startDate: "2027-03-26",
    endDate: "2027-03-26",
    name: [{ language: "DE", text: "Karfreitag" }],
    nationwide: true,
  },
  {
    id: "fcd0558e",
    startDate: "2027-03-29",
    endDate: "2027-03-29",
    name: [{ language: "DE", text: "Ostermontag" }],
    nationwide: true,
  },
  {
    id: "5dce4648",
    startDate: "2027-05-01",
    endDate: "2027-05-01",
    name: [{ language: "DE", text: "Tag der Arbeit" }],
    nationwide: true,
  },
  {
    id: "889b46cc",
    startDate: "2027-05-06",
    endDate: "2027-05-06",
    name: [{ language: "DE", text: "Christi Himmelfahrt" }],
    nationwide: true,
  },
  {
    id: "689daf70",
    startDate: "2027-05-17",
    endDate: "2027-05-17",
    name: [{ language: "DE", text: "Pfingstmontag" }],
    nationwide: true,
  },
  {
    id: "c1b5e914",
    startDate: "2027-05-27",
    endDate: "2027-05-27",
    name: [{ language: "DE", text: "Fronleichnam" }],
    nationwide: false,
    subdivisions: [
      { code: "DE-HE" },
      { code: "DE-SL" },
      { code: "DE-NW" },
      { code: "DE-BW" },
      { code: "DE-RP" },
      { code: "DE-BY" },
    ],
  },
  {
    id: "b797f7bd",
    startDate: "2027-08-08",
    endDate: "2027-08-08",
    name: [{ language: "DE", text: "Friedensfest" }],
    nationwide: false,
    subdivisions: [{ code: "DE-BY-AU" }],
  },
  {
    id: "5773654b",
    startDate: "2027-08-15",
    endDate: "2027-08-15",
    name: [{ language: "DE", text: "Mariä Himmelfahrt" }],
    nationwide: false,
    subdivisions: [{ code: "DE-SL" }, { code: "DE-BY" }],
  },
];

/** The school year 2026/27 of Bayern, as the app stores it. */
export function bayern2026(): SchoolYear {
  const school = parseHolidays(SCHOOL_ANSWER, "school", "DE-BY") ?? [];
  const publicHolidays = parseHolidays(PUBLIC_ANSWER, "public", "DE-BY") ?? [];
  return {
    state: "DE-BY",
    startYear: 2026,
    fetchedAt: "2026-11-10T08:00:00.000Z",
    holidays: [...school, ...publicHolidays].sort((a, b) => a.start.localeCompare(b.start)),
  };
}

/** A fake `fetchJson`. Each rule answers the URLs that contain `match`. Unknown URLs fail. */
export function fakeFetch(rules: readonly { match: string; result: FetchResult }[]) {
  const urls: string[] = [];
  const fetchJson: FetchJson = (url) => {
    urls.push(url);
    const rule = rules.find((entry) => url.includes(entry.match));
    return Promise.resolve(rule?.result ?? { kind: "http-error", status: 404 });
  };
  return { fetchJson, urls };
}

type Rule = { match: string; result: FetchResult };

/** Answers with the holidays of Bayern 2026/27 for any school year. Other states get the same days. */
export function rulesFor(state: StateCode): [school: Rule, publicHolidays: Rule] {
  const forState = (answer: unknown): unknown =>
    JSON.parse(JSON.stringify(answer).replaceAll('"DE-BY"', JSON.stringify(state)));
  return [
    {
      match: `SchoolHolidays?countryIsoCode=DE&subdivisionCode=${state}`,
      result: { kind: "ok", json: forState(SCHOOL_ANSWER) },
    },
    {
      match: `PublicHolidays?countryIsoCode=DE&subdivisionCode=${state}`,
      result: { kind: "ok", json: forState(PUBLIC_ANSWER) },
    },
  ];
}

export const BAYERN_RULES = rulesFor("DE-BY");
