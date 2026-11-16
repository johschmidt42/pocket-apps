import { describe, expect, it } from "vitest";
import { dayNumber } from "./dates.ts";
import { TRUNK_COLORS, type ZeitstrahlData } from "./schema.ts";
import { testEntry } from "./test-data.ts";
import {
  activeTimeline,
  addTimeline,
  defaultPrecision,
  removeEntry,
  removeTimeline,
  renameTimeline,
  selectTimeline,
  nextTrunkColor,
  setScale,
  sortEntries,
  startOf,
  toggleEntry,
  upsertEntry,
} from "./timelines.ts";

const POINT = testEntry("p", { kind: "point", date: "2026-03" });
const RANGE = testEntry("r", { kind: "range", start: "2020", end: "2022" });

const DATA: ZeitstrahlData = {
  activeTimelineId: "a",
  timelines: [
    { id: "a", name: "A", scale: "real", trunk: "gray", entries: [POINT, RANGE] },
    { id: "b", name: "B", scale: "real", trunk: "gray", entries: [] },
  ],
};

describe("timelines", () => {
  it("finds the active timeline", () => {
    expect(activeTimeline(DATA).name).toBe("A");
    expect(activeTimeline({ ...DATA, activeTimelineId: "x" }).name).toBe("A");
    expect(() => activeTimeline({ activeTimelineId: "a", timelines: [] })).toThrow();
  });

  it("selects only a timeline that exists", () => {
    expect(selectTimeline(DATA, "b").activeTimelineId).toBe("b");
    expect(selectTimeline(DATA, "x")).toBe(DATA);
  });

  it("adds, renames and removes timelines", () => {
    const added = addTimeline(DATA, "C", "c");
    expect(added.activeTimelineId).toBe("c");
    expect(added.timelines.at(-1)).toEqual({
      id: "c",
      name: "C",
      scale: "real",
      trunk: "gray",
      entries: [],
    });
    expect(renameTimeline(added, "c", "Neu").timelines.at(-1)?.name).toBe("Neu");

    // Removing the active timeline shows the first one.
    expect(removeTimeline(added, "c")).toEqual({ ...DATA, activeTimelineId: "a" });
    // Removing another timeline keeps the active one.
    expect(removeTimeline(added, "b").activeTimelineId).toBe("c");
    // The last timeline stays.
    const single = removeTimeline(DATA, "b");
    expect(removeTimeline(single, "a")).toBe(single);
  });

  it("changes the scale of one timeline", () => {
    const changed = setScale(DATA, "a", "compact");
    expect(changed.timelines.map((timeline) => timeline.scale)).toEqual(["compact", "real"]);
  });

  it("gives the trunk the next color and starts again after the last color", () => {
    let data = nextTrunkColor(DATA, "b");
    expect(data.timelines.map((timeline) => timeline.trunk)).toEqual(["gray", "green"]);
    for (let step = 1; step < TRUNK_COLORS.length; step++) data = nextTrunkColor(data, "b");
    expect(data.timelines[1]?.trunk).toBe("gray");
  });

  it("adds, replaces, toggles and removes entries", () => {
    const added = upsertEntry(DATA, "b", POINT);
    expect(added.timelines[1]?.entries).toEqual([POINT]);
    const replaced = upsertEntry(added, "b", { ...POINT, title: "Neu" });
    expect(replaced.timelines[1]?.entries.map((entry) => entry.title)).toEqual(["Neu"]);

    const toggled = toggleEntry(DATA, "a", "p");
    expect(toggled.timelines[0]?.entries.map((entry) => entry.visible)).toEqual([false, true]);

    expect(removeEntry(DATA, "a", "p").timelines[0]?.entries).toEqual([RANGE]);
  });

  it("sorts entries by time", () => {
    const later = testEntry("l", { kind: "range", start: "2020", end: "2025" });
    const sorted = sortEntries([POINT, later, RANGE], dayNumber(2026, 11, 14));
    expect(sorted.map((entry) => entry.id)).toEqual(["r", "l", "p"]);
  });

  it("knows the start and the precision for a new entry", () => {
    expect(startOf(POINT)).toBe("2026-03");
    expect(startOf(RANGE)).toBe("2020");
    expect(defaultPrecision([])).toBe("day");
    expect(defaultPrecision([POINT])).toBe("month");
    expect(defaultPrecision([POINT, RANGE])).toBe("year");
  });
});
