import { describe, expect, it } from "vitest";
import { holidaysUrl, loadSchoolYear, parseHolidays } from "./open-holidays.ts";
import { BAYERN_RULES, fakeFetch, PUBLIC_ANSWER, SCHOOL_ANSWER } from "./test-data.ts";

const NOW = new Date("2026-11-10T08:00:00.000Z");
const BY_2026 = { state: "DE-BY", startYear: 2026 } as const;

const entry = (fields: Record<string, unknown>) => ({
  id: "x",
  startDate: "2026-10-05",
  endDate: "2026-10-24",
  name: [{ language: "DE", text: "Herbstferien" }],
  nationwide: false,
  subdivisions: [{ code: "DE-SH" }],
  ...fields,
});

describe("holidaysUrl", () => {
  it("asks for one state, in German, for the given days", () => {
    expect(holidaysUrl("SchoolHolidays", "DE-BY", "2026-08-01", "2027-09-30")).toBe(
      "https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-BY&languageIsoCode=DE&validFrom=2026-08-01&validTo=2027-09-30",
    );
  });
});

describe("parseHolidays", () => {
  it("reads the school holidays of Bayern", () => {
    const holidays = parseHolidays(SCHOOL_ANSWER, "school", "DE-BY");
    expect(holidays?.map((holiday) => holiday.name)).toEqual([
      "Sommerferien",
      "Herbstferien",
      "Buß- und Bettag",
      "Weihnachtsferien",
      "Frühjahrsferien",
      "Osterferien",
      "Pfingstferien",
      "Sommerferien",
    ]);
    expect(holidays?.[1]).toEqual({
      id: "b5045dcf",
      kind: "school",
      name: "Herbstferien",
      start: "2026-11-02",
      end: "2026-11-06",
    });
  });

  it("keeps public holidays of all Germany and of the state, not of one city", () => {
    const names = parseHolidays(PUBLIC_ANSWER, "public", "DE-BY")?.map((holiday) => holiday.name);
    expect(names).toContain("Tag der Deutschen Einheit");
    expect(names).toContain("Heilige Drei Könige");
    expect(names).not.toContain("Friedensfest");
  });

  it("skips exceptions, vocational schools and other states", () => {
    const answer = [
      entry({ id: "main" }),
      entry({ id: "islands", tags: ["Exception"] }),
      entry({ id: "other", subdivisions: [{ code: "DE-HH" }] }),
      entry({ id: "vocational", groups: [{ code: "DE-MV-BBS" }] }),
      entry({ id: "general", groups: [{ code: "DE-MV-ABS" }, { code: "DE-MV-BBS" }] }),
      entry({ id: "germany", nationwide: true, subdivisions: undefined }),
    ];
    expect(parseHolidays(answer, "school", "DE-SH")?.map((holiday) => holiday.id)).toEqual([
      "main",
      "general",
      "germany",
    ]);
  });

  it("takes another language if there is no German name", () => {
    const answer = [entry({ name: [{ language: "EN", text: "Autumn holidays" }] })];
    expect(parseHolidays(answer, "school", "DE-SH")?.[0]?.name).toBe("Autumn holidays");
  });

  it("gives null for an unknown answer", () => {
    expect(parseHolidays({ error: "x" }, "school", "DE-BY")).toBeNull();
    expect(parseHolidays([entry({ name: [] })], "school", "DE-SH")).toBeNull();
  });
});

describe("loadSchoolYear", () => {
  it("loads school holidays and public holidays in one list", async () => {
    const fake = fakeFetch(BAYERN_RULES);
    const result = await loadSchoolYear(fake.fetchJson, BY_2026, NOW);
    expect(fake.urls).toHaveLength(2);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.year).toMatchObject({
      state: "DE-BY",
      startYear: 2026,
      fetchedAt: "2026-11-10T08:00:00.000Z",
    });
    const starts = result.year.holidays.map((holiday) => holiday.start);
    expect(starts).toEqual([...starts].sort());
    expect(result.year.holidays.some((holiday) => holiday.kind === "public")).toBe(true);
  });

  it("tells offline, failed and empty apart", async () => {
    const load = (rules: Parameters<typeof fakeFetch>[0]) =>
      loadSchoolYear(fakeFetch(rules).fetchJson, BY_2026, NOW);
    const publicOk = BAYERN_RULES[1];

    expect(await load([{ match: "", result: { kind: "offline" } }])).toEqual({ kind: "offline" });
    expect(await load([{ match: "", result: { kind: "http-error", status: 500 } }])).toEqual({
      kind: "failed",
    });
    expect(await load([{ match: "School", result: { kind: "bad-body" } }, publicOk])).toEqual({
      kind: "failed",
    });
    expect(
      await load([{ match: "School", result: { kind: "ok", json: { x: 1 } } }, publicOk]),
    ).toEqual({ kind: "failed" });
    expect(await load([BAYERN_RULES[0], { match: "Public", result: { kind: "offline" } }])).toEqual(
      { kind: "offline" },
    );
    expect(await load([{ match: "School", result: { kind: "ok", json: [] } }, publicOk])).toEqual({
      kind: "empty",
    });
  });
});
