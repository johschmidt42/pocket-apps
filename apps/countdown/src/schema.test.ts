import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { initialData, schema } from "./schema.ts";

describe("countdown schema", () => {
  it("starts at version 1 with the end of the year", () => {
    expect(currentVersion(schema)).toBe(1);
    expect(schema.initial().events).toHaveLength(1);
    const now = new Date(2026, 10, 10, 12, 0);
    expect(initialData(now, "x")).toEqual({
      events: [
        {
          id: "x",
          name: "Jahresende 2026",
          date: "2027-01-01",
          time: null,
          createdAt: now.toISOString(),
        },
      ],
    });
  });

  it("accepts a time with hours and minutes, or no time", () => {
    const event = {
      id: "a",
      name: "Hochzeit",
      date: "2027-06-12",
      time: "14:30",
      createdAt: "2026-11-10T12:00:00.000Z",
    };

    expect(
      schema.validate.parse({ events: [event, { ...event, id: "b", time: null }] }).events,
    ).toHaveLength(2);
    expect(schema.validate.safeParse({ events: [{ ...event, time: "14:30:00" }] }).success).toBe(
      false,
    );
  });
});
