import { describe, expect, it } from "vitest";
import { dayNumber } from "./dates.ts";
import {
  buildScale,
  dateChips,
  GEOMETRY,
  layoutTimeline,
  placeLabels,
  resolveSides,
  tickDays,
  tickLabel,
  tickStep,
  yOf,
  type Mark,
} from "./layout.ts";
import type { Entry, When } from "./schema.ts";
import { testEntry } from "./test-data.ts";

const TODAY = dayNumber(2026, 11, 14);

const CV: Entry[] = [
  testEntry("birth", { kind: "point", date: "1995-04-12" }),
  testEntry("school", { kind: "range", start: "2001", end: "2013" }),
  testEntry("study", { kind: "range", start: "2013-10", end: "2018-09" }),
  testEntry("job", { kind: "ongoing", start: "2018-11" }),
];

function mark(layout: ReturnType<typeof layoutTimeline>, id: string) {
  const found = layout.marks.find((candidate) => candidate.entry.id === id);
  if (!found) throw new Error(`No mark ${id}`);
  return found;
}

describe("resolveSides", () => {
  it("alternates automatic sides and keeps fixed sides", () => {
    const [a, b, c, d] = CV;
    expect(resolveSides([a, b, c, d].flatMap((entry) => (entry ? [entry] : [])))).toEqual([
      "left",
      "right",
      "left",
      "right",
    ]);
    const fixed = CV.map((entry, index) =>
      index === 1 ? { ...entry, side: "left" as const } : entry,
    );
    // The entry after a fixed "left" goes right.
    expect(resolveSides(fixed)).toEqual(["left", "left", "right", "left"]);
  });
});

describe("layoutTimeline", () => {
  it("is empty without visible entries", () => {
    const hidden = CV.map((entry) => ({ ...entry, visible: false }));
    expect(layoutTimeline(hidden, "real", TODAY, "two")).toEqual({
      height: 0,
      segments: [],
      breaks: [],
      ticks: [],
      today: null,
      marks: [],
    });
  });

  it("puts real distances on one line, with year ticks and today", () => {
    const layout = layoutTimeline(CV, "real", TODAY, "two");
    // 4 entries × 80 px is less than the minimum length of the axis.
    const axis = GEOMETRY.minAxis;

    expect(layout.segments).toEqual([{ top: GEOMETRY.pad, bottom: GEOMETRY.pad + axis }]);
    expect(layout.breaks).toEqual([]);
    expect(mark(layout, "birth").y1).toBe(GEOMETRY.pad);
    // The ongoing range ends after today, at the end of the axis.
    expect(mark(layout, "job").y2).toBeCloseTo(GEOMETRY.pad + axis);
    expect(layout.today).toBeGreaterThan(mark(layout, "job").y1);
    expect(layout.ticks.map((tick) => tick.label)).toEqual([
      "2000",
      "2005",
      "2010",
      "2015",
      "2020",
      "2025",
    ]);
    expect(layout.height).toBeGreaterThanOrEqual(GEOMETRY.pad * 2 + axis);
  });

  it("keeps the order of the sides and the colors in one column", () => {
    const layout = layoutTimeline(CV, "real", TODAY, "one");
    expect(layout.marks.map((entry) => entry.side)).toEqual(["right", "right", "right", "right"]);
    expect(mark(layout, "birth").colorSide).toBe("left");
    expect(mark(layout, "school").colorSide).toBe("right");
  });

  it("keeps the sides of the other entries when an entry is hidden", () => {
    const hidden = CV.map((entry) =>
      entry.id === "school" ? { ...entry, visible: false } : entry,
    );
    const layout = layoutTimeline(hidden, "real", TODAY, "two");
    expect(layout.marks.map((entry) => [entry.entry.id, entry.side])).toEqual([
      ["birth", "left"],
      ["study", "left"],
      ["job", "right"],
    ]);
  });

  it("cuts long gaps in the compact scale", () => {
    const layout = layoutTimeline(CV, "compact", TODAY, "two");
    expect(layout.segments).toHaveLength(2);
    expect(layout.breaks).toEqual([
      {
        top: GEOMETRY.pad,
        bottom: GEOMETRY.pad + GEOMETRY.breakHeight,
        label: "6 Jahre",
      },
    ]);
    // The point before the gap has no length. Thus the first segment has no length.
    expect(layout.segments[0]).toEqual({ top: GEOMETRY.pad, bottom: GEOMETRY.pad });
    expect(mark(layout, "school").y1).toBe(GEOMETRY.pad + GEOMETRY.breakHeight);
    // No tick in the cut gap: the first tick is after the start of the school.
    expect(layout.ticks[0]?.y).toBeGreaterThanOrEqual(mark(layout, "school").y1);
  });

  it("has no ticks when all kept pieces are points", () => {
    const points = [
      testEntry("a", { kind: "point", date: "2000" }),
      testEntry("b", { kind: "point", date: "2010" }),
      testEntry("c", { kind: "point", date: "2020" }),
    ];
    const layout = layoutTimeline(points, "compact", TODAY, "two");
    expect(layout.ticks).toEqual([]);
    expect(layout.breaks.map((gap) => gap.label)).toEqual(["10 Jahre", "10 Jahre"]);
    expect(layout.today).toBeNull();
  });

  it("shows one point without ticks", () => {
    const layout = layoutTimeline(
      [testEntry("a", { kind: "point", date: "2026-11-14" })],
      "real",
      TODAY,
      "two",
    );
    expect(layout.ticks).toEqual([]);
    expect(layout.today).toBe(GEOMETRY.pad);
    expect(mark(layout, "a")).toMatchObject({ y1: GEOMETRY.pad, y2: GEOMETRY.pad, side: "left" });
  });

  it("gives short ranges a minimum height and ignores hidden entries", () => {
    const entries = [
      testEntry("long", { kind: "range", start: "2000", end: "2020" }),
      testEntry("short", { kind: "range", start: "2010-05-01", end: "2010-05-01" }),
      testEntry("hidden", { kind: "point", date: "1900" }, { visible: false }),
    ];
    const layout = layoutTimeline(entries, "real", TODAY, "two");
    const short = mark(layout, "short");
    expect(short.y2 - short.y1).toBe(GEOMETRY.minBar);
    expect(layout.marks.map((entry) => entry.entry.id)).not.toContain("hidden");
  });

  it("makes the axis long enough that many cards stay next to their marks", () => {
    const entries = Array.from({ length: 30 }, (_, index) =>
      testEntry(String(index), { kind: "point", date: `${String(1990 + index)}-06-01` }),
    );
    for (const columns of ["one", "two"] as const) {
      const layout = layoutTimeline(entries, "real", TODAY, columns);
      for (const placed of layout.marks) {
        const cardMiddle = placed.labelTop + GEOMETRY.labelHeight / 2;
        expect(Math.abs(cardMiddle - placed.y1)).toBeLessThan(GEOMETRY.labelHeight);
      }
    }
  });

  it("leaves out the tick chips that the ring of a point would cover", () => {
    const entries = [
      testEntry("a", { kind: "point", date: "2000" }),
      testEntry("b", { kind: "point", date: "2010" }),
    ];
    const layout = layoutTimeline(entries, "real", TODAY, "two");
    const labels = layout.ticks.map((tick) => tick.label);
    expect(labels).not.toContain("2000");
    expect(labels).not.toContain("2010");
    expect(labels).toEqual(["2002", "2004", "2006", "2008"]);
  });

  it("places the hidden entries too when the user wants to see them", () => {
    const entries = [
      testEntry("a", { kind: "point", date: "2000" }),
      testEntry("hidden", { kind: "point", date: "1990" }, { visible: false }),
    ];
    const layout = layoutTimeline(entries, "real", TODAY, "two", true);
    expect(mark(layout, "hidden").y1).toBe(GEOMETRY.pad);
    expect(mark(layout, "a").y1).toBeGreaterThan(GEOMETRY.pad);
  });
});

describe("dateChips", () => {
  const at = (when: When, y1: number, y2: number): Mark => ({
    entry: testEntry("e", when),
    colorSide: "left",
    side: "left",
    y1,
    y2,
    labelTop: 0,
  });

  it("shows the start and the end of a range where the branch touches the trunk", () => {
    expect(dateChips(at({ kind: "range", start: "2018-10", end: "2021-09" }, 100, 300))).toEqual([
      { y: 100, label: "10/2018" },
      { y: 300, label: "09/2021" },
    ]);
  });

  it("shows one chip for a point, an ongoing range and a short range", () => {
    expect(dateChips(at({ kind: "point", date: "1995-04-12" }, 50, 50))).toEqual([
      { y: 50, label: "12.04.1995" },
    ]);
    expect(dateChips(at({ kind: "ongoing", start: "2024-01" }, 50, 400))).toEqual([
      { y: 50, label: "01/2024" },
    ]);
    expect(dateChips(at({ kind: "range", start: "2016-02", end: "2016-07" }, 50, 60))).toEqual([
      { y: 55, label: "02/2016 – 07/2016" },
    ]);
  });
});

describe("placeLabels", () => {
  const step = GEOMETRY.labelHeight + GEOMETRY.labelGap;
  const half = GEOMETRY.labelHeight / 2;

  it("centers each label on its anchor when there is space", () => {
    expect(placeLabels([100, 200])).toEqual([100 - half, 200 - half]);
  });

  it("moves close labels apart around the middle of their anchors", () => {
    const tops = placeLabels([200, 200, 200]);
    expect(tops).toEqual([200 - half - step, 200 - half, 200 - half + step]);
  });

  it("does not put a label above the top", () => {
    expect(placeLabels([0, 0])).toEqual([0, step]);
  });

  it("merges a group with the group before it", () => {
    const tops = placeLabels([100, 100, 140]);
    for (let index = 1; index < tops.length; index++) {
      expect((tops[index] ?? 0) - (tops[index - 1] ?? 0)).toBeCloseTo(step);
    }
  });
});

describe("ticks", () => {
  it("takes the smallest step with enough space", () => {
    expect(tickStep(0)).toBeNull();
    expect(tickStep(100)).toMatchObject({ unit: "day", size: 1 });
    expect(tickStep(10)).toMatchObject({ unit: "day", size: 7 });
    expect(tickStep(2)).toMatchObject({ unit: "month", size: 1 });
    expect(tickStep(0.4)).toMatchObject({ unit: "month", size: 6 });
    expect(tickStep(0.035)).toMatchObject({ unit: "year", size: 5 });
    expect(tickStep(0.000_01)).toBeNull();
  });

  it("puts ticks on years, months, Mondays and days", () => {
    const from = dayNumber(2001, 2, 10);
    const years = { unit: "year", size: 5, days: 0 } as const;
    expect(
      tickDays(years, from, dayNumber(2016, 1, 1)).map((day) => tickLabel(years, day)),
    ).toEqual(["2005", "2010", "2015"]);
    const quarters = { unit: "month", size: 3, days: 0 } as const;
    expect(
      tickDays(quarters, from, dayNumber(2002, 1, 1)).map((day) => tickLabel(quarters, day)),
    ).toEqual(["Apr.", "Juli", "Okt.", "2002"]);
    const weeks = { unit: "day", size: 7, days: 0 } as const;
    // 2026-11-14 is a Saturday. The next Mondays are 16 and 23 November.
    expect(
      tickDays(weeks, dayNumber(2026, 11, 14), dayNumber(2026, 11, 30)).map((day) =>
        tickLabel(weeks, day),
      ),
    ).toEqual(["16.11.", "23.11.", "30.11."]);
    const days = { unit: "day", size: 1, days: 0 } as const;
    expect(tickDays(days, 10, 12)).toEqual([10, 11, 12]);
  });
});

describe("scales", () => {
  it("maps days in a cut gap to the middle of the gap", () => {
    const scale = buildScale(
      [
        { from: 0, to: 100 },
        { from: 1000, to: 1100 },
      ],
      "compact",
      400,
    );
    const [first, second] = scale.pieces;
    expect(first?.top).toBe(GEOMETRY.pad);
    const gapTop = GEOMETRY.pad + 100 * scale.pixelsPerDay;
    expect(second?.top).toBe(gapTop + GEOMETRY.breakHeight);
    expect(yOf(scale, 500)).toBe(gapTop + GEOMETRY.breakHeight / 2);
    expect(yOf(scale, -50)).toBe(GEOMETRY.pad);
    expect(yOf(scale, 5000)).toBe(GEOMETRY.pad + 400);
    expect(yOf({ pieces: [], pixelsPerDay: 1 }, 5)).toBe(GEOMETRY.pad);
  });

  it("does not let a short kept time fill the whole axis", () => {
    const scale = buildScale(
      [
        { from: 0, to: 1 },
        { from: 1825, to: 1825 },
      ],
      "compact",
      400,
    );
    // Real scale: 400 px for 1825 days. The compact scale is at most 5 times larger.
    expect(scale.pixelsPerDay).toBeCloseTo((400 / 1825) * GEOMETRY.maxZoom);
  });

  it("keeps short gaps in the compact scale", () => {
    const scale = buildScale(
      [
        { from: 0, to: 100 },
        { from: 105, to: 200 },
      ],
      "compact",
      400,
    );
    expect(scale.pieces).toEqual([{ from: 0, to: 200, top: GEOMETRY.pad }]);
  });
});
