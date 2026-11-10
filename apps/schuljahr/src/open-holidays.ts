import type { FetchJson, FetchResult } from "@pocket-apps/core/fetch-json";
import { z } from "zod";
import type { Holiday, SchoolYear, Selection } from "./schema.ts";
import { loadDays } from "./school-years.ts";
import type { StateCode } from "./states.ts";

const BASE_URL = "https://openholidaysapi.org";

type Endpoint = "SchoolHolidays" | "PublicHolidays";

/** The URL of the school holidays or public holidays of one state, in German. */
export function holidaysUrl(
  endpoint: Endpoint,
  state: StateCode,
  from: string,
  to: string,
): string {
  const params = new URLSearchParams({
    countryIsoCode: "DE",
    subdivisionCode: state,
    languageIsoCode: "DE",
    validFrom: from,
    validTo: to,
  });
  return `${BASE_URL}/${endpoint}?${params.toString()}`;
}

const textSchema = z.object({ language: z.string(), text: z.string().min(1) });
const codeSchema = z.object({ code: z.string() });

const entrySchema = z.object({
  id: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  name: z.tuple([textSchema], textSchema),
  nationwide: z.boolean().optional(),
  subdivisions: z.array(codeSchema).optional(),
  groups: z.array(codeSchema).optional(),
  tags: z.array(z.string()).optional(),
});

type Entry = z.infer<typeof entrySchema>;

/**
 * True if the entry is valid for the general schools in the whole state:
 * - The entry is for all of Germany, or for the state. Not only for a city (Augsburg: "DE-BY-AU").
 * - It is no exception for a part of the state (the North Sea islands in Schleswig-Holstein).
 * - It has no school groups, or the group of the general schools ("DE-MV-ABS"), not only the
 *   vocational schools ("DE-MV-BBS").
 */
function appliesToState(entry: Entry, state: StateCode): boolean {
  const inState =
    entry.nationwide === true ||
    (entry.subdivisions ?? []).some((subdivision) => subdivision.code === state);
  const exception = (entry.tags ?? []).includes("Exception");
  const groups = entry.groups ?? [];
  const generalSchools = groups.length === 0 || groups.some((group) => group.code.endsWith("-ABS"));
  return inState && !exception && generalSchools;
}

/** Reads an answer of OpenHolidays. `null` if the answer has an unknown shape. */
export function parseHolidays(
  json: unknown,
  kind: Holiday["kind"],
  state: StateCode,
): Holiday[] | null {
  const parsed = z.array(entrySchema).safeParse(json);
  if (!parsed.success) return null;
  return parsed.data
    .filter((entry) => appliesToState(entry, state))
    .map((entry) => ({
      id: entry.id,
      kind,
      name: (entry.name.find((text) => text.language === "DE") ?? entry.name[0]).text,
      start: entry.startDate,
      end: entry.endDate,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export type LoadResult =
  | { kind: "ok"; year: SchoolYear }
  /** No internet. */
  | { kind: "offline" }
  /** OpenHolidays sent an error or an unknown answer. */
  | { kind: "failed" }
  /** OpenHolidays has no school holidays for this school year yet. */
  | { kind: "empty" };

/** The holidays of one answer, or the failed result. */
function holidaysOrFailure(
  result: FetchResult,
  kind: Holiday["kind"],
  state: StateCode,
): Holiday[] | LoadResult {
  switch (result.kind) {
    case "ok":
      return parseHolidays(result.json, kind, state) ?? { kind: "failed" };
    case "offline":
      return { kind: "offline" };
    case "bad-body":
    case "http-error":
      return { kind: "failed" };
  }
}

/** Loads the school holidays and the public holidays of a school year. Two requests. */
export async function loadSchoolYear(
  fetchJson: FetchJson,
  { state, startYear }: Selection,
  now: Date,
): Promise<LoadResult> {
  const { from, to } = loadDays(startYear);
  const [schoolAnswer, publicAnswer] = await Promise.all([
    fetchJson(holidaysUrl("SchoolHolidays", state, from, to)),
    fetchJson(holidaysUrl("PublicHolidays", state, from, to)),
  ]);
  const school = holidaysOrFailure(schoolAnswer, "school", state);
  if (!Array.isArray(school)) return school;
  const publicHolidays = holidaysOrFailure(publicAnswer, "public", state);
  if (!Array.isArray(publicHolidays)) return publicHolidays;
  if (school.length === 0) return { kind: "empty" };
  return {
    kind: "ok",
    year: {
      state,
      startYear,
      fetchedAt: now.toISOString(),
      holidays: [...school, ...publicHolidays].sort((a, b) => a.start.localeCompare(b.start)),
    },
  };
}
