import { describe, expect, it } from "vitest";
import {
  buildEvent,
  isValidMoment,
  phaseOf,
  removeEvent,
  splitEvents,
  targetOf,
  timeLeft,
  upsertEvent,
  waitedPart,
} from "./countdown.ts";
import type { CountdownEvent } from "./schema.ts";

const event = (fields: Partial<CountdownEvent> & { id: string }): CountdownEvent => ({
  name: fields.id,
  date: "2027-06-12",
  time: null,
  createdAt: new Date(2026, 10, 10, 12, 0).toISOString(),
  ...fields,
});

describe("targetOf and isValidMoment", () => {
  it("uses the local time, or 0:00 without a time", () => {
    expect(targetOf({ date: "2027-06-12", time: "14:30" })).toEqual(new Date(2027, 5, 12, 14, 30));
    expect(targetOf({ date: "2027-06-12", time: null })).toEqual(new Date(2027, 5, 12, 0, 0));
  });

  it("accepts only real moments", () => {
    expect(isValidMoment({ date: "2027-06-12", time: "14:30" })).toBe(true);
    expect(isValidMoment({ date: "", time: null })).toBe(false);
    expect(isValidMoment({ date: "10000-01-01", time: null })).toBe(false);
    expect(isValidMoment({ date: "2027-13-45", time: null })).toBe(false);
  });
});

describe("timeLeft", () => {
  it("splits the time into days, hours, minutes and seconds", () => {
    const now = new Date(2026, 10, 10, 12, 0, 0);

    expect(timeLeft(new Date(2026, 10, 12, 15, 4, 5), now)).toEqual({
      past: false,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      totalHours: 51,
    });
  });

  it("counts calendar days across a change of summer time", () => {
    // From winter time to summer time: the day count stays at full days.
    const left = timeLeft(new Date(2027, 5, 12, 0, 0), new Date(2026, 10, 10, 0, 0));

    expect([left.days, left.hours, left.minutes]).toEqual([214, 0, 0]);
  });

  it("counts the time since a past moment", () => {
    const now = new Date(2026, 10, 10, 12, 0, 0);

    expect(timeLeft(new Date(2026, 10, 9, 11, 0, 0), now)).toMatchObject({
      past: true,
      days: 1,
      hours: 1,
    });
  });
});

describe("phaseOf", () => {
  const now = new Date(2026, 10, 10, 15, 0);

  it("keeps an event without a time on today for the whole day", () => {
    expect(phaseOf(event({ id: "a", date: "2026-11-10" }), now)).toBe("today");
    expect(phaseOf(event({ id: "b", date: "2026-11-10", time: "14:00" }), now)).toBe("past");
    expect(phaseOf(event({ id: "c", date: "2026-11-10", time: "16:00" }), now)).toBe("coming");
    expect(phaseOf(event({ id: "d", date: "2026-11-09" }), now)).toBe("past");
  });
});

describe("waitedPart", () => {
  it("gives the part of the waiting time that is over", () => {
    const item = event({
      id: "a",
      date: "2026-11-20",
      createdAt: new Date(2026, 10, 10).toISOString(),
    });

    expect(waitedPart(item, new Date(2026, 10, 15))).toBeCloseTo(0.5);
    expect(waitedPart(item, new Date(2026, 10, 1))).toBe(0);
    expect(waitedPart(item, new Date(2026, 10, 25))).toBe(1);
  });

  it("is complete for an event that was in the past when the user added it", () => {
    const item = event({
      id: "a",
      date: "2026-01-01",
      createdAt: new Date(2026, 10, 10).toISOString(),
    });

    expect(waitedPart(item, new Date(2026, 10, 11))).toBe(1);
  });
});

describe("events", () => {
  const now = new Date(2026, 10, 10, 12, 0);
  const list = [
    event({ id: "late", date: "2027-07-23" }),
    event({ id: "old", date: "2026-08-01" }),
    event({ id: "soon", date: "2026-12-24", time: "18:00" }),
    event({ id: "today", date: "2026-11-10" }),
    event({ id: "older", date: "2026-01-01" }),
  ];

  it("splits into coming events (nearest first) and past events (newest first)", () => {
    const { upcoming, past } = splitEvents(list, now);

    expect(upcoming.map((item) => item.id)).toEqual(["today", "soon", "late"]);
    expect(past.map((item) => item.id)).toEqual(["old", "older"]);
  });

  it("builds a new event or changes one and keeps its ID and creation time", () => {
    const input = { name: "Feier", date: "2027-01-01", time: null };

    expect(buildEvent(input, null, now, "new-id")).toEqual({
      id: "new-id",
      createdAt: now.toISOString(),
      ...input,
    });
    const existing = list[0];
    expect(buildEvent(input, existing ?? null, now, "x")).toEqual({ ...existing, ...input });
  });

  it("replaces, adds and removes an event", () => {
    expect(
      upsertEvent(list, event({ id: "soon", name: "Weihnachten" })).find(
        (item) => item.id === "soon",
      )?.name,
    ).toBe("Weihnachten");
    expect(upsertEvent(list, event({ id: "new" }))).toHaveLength(6);
    expect(removeEvent(list, "old").map((item) => item.id)).toEqual([
      "late",
      "soon",
      "today",
      "older",
    ]);
  });
});
