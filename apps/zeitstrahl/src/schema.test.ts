import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { initialData, schema, type ZeitstrahlData } from "./schema.ts";

describe("zeitstrahl schema", () => {
  it("starts at version 1 with one empty timeline", () => {
    expect(currentVersion(schema)).toBe(1);
    const initial = schema.initial();
    expect(schema.validate.parse(initial)).toEqual(initial);
    let next = 0;
    expect(initialData(() => String(++next))).toEqual({
      activeTimelineId: "1",
      timelines: [{ id: "1", name: "Mein Zeitstrahl", scale: "real", trunk: "gray", entries: [] }],
    });
  });

  it("accepts days, months and years and rejects other dates", () => {
    const data = (date: string): ZeitstrahlData => ({
      activeTimelineId: "a",
      timelines: [
        {
          id: "a",
          name: "A",
          scale: "real",
          trunk: "gray",
          entries: [
            {
              id: "e",
              title: "E",
              description: "",
              when: { kind: "point", date },
              side: "auto",
              visible: true,
            },
          ],
        },
      ],
    });
    for (const date of ["2026-11-14", "2026-11", "2026", "0800"]) {
      expect(schema.validate.safeParse(data(date)).success).toBe(true);
    }
    for (const date of ["2026-13", "26", "14.11.2026", "2026-02-30"]) {
      expect(schema.validate.safeParse(data(date)).success).toBe(false);
    }
  });

  it("needs an active timeline that exists", () => {
    const result = schema.validate.safeParse({
      activeTimelineId: "x",
      timelines: [{ id: "a", name: "A", scale: "real", trunk: "gray", entries: [] }],
    });
    expect(result.success).toBe(false);
    expect(schema.validate.safeParse({ activeTimelineId: "a", timelines: [] }).success).toBe(false);
  });
});
