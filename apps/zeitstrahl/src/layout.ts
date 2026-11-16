// The layout of a vertical timeline: pure calculations, no React.
// Time goes from top to bottom. The center line is the axis. Entries are left or right of it.
// All y values are pixels from the top of the picture. All x values are pixels from the center line.

import {
  dayNumber,
  formatDuration,
  formatPartial,
  formatWhen,
  fromDayNumber,
  interval,
  type Interval,
  type Precision,
} from "./dates.ts";
import type { Entry, Scale, Side } from "./schema.ts";
import { sortEntries } from "./timelines.ts";

/** The side of an entry after "auto" is resolved. */
export type ResolvedSide = Exclude<Side, "auto">;

export const RESOLVED_SIDES: readonly ResolvedSide[] = ["left", "right"];

export const GEOMETRY = {
  /** Space above the first moment and below the last moment. */
  pad: 32,
  /** The height of a label card (title and date) and the space between two cards. */
  labelHeight: 60,
  labelGap: 10,
  /**
   * The length of the axis: 90 px per entry, at least 400 px, at most 1600 px. But the axis is
   * always long enough for the cards of the side with the most cards. Else the cards move far
   * away from their marks.
   */
  perEntry: 90,
  minAxis: 400,
  maxAxis: 1600,
  /** The height of a cut gap (scale "compact"). */
  breakHeight: 48,
  /** A gap is cut if it is longer than this part of the whole time. */
  breakShare: 0.1,
  /** The compact scale shows the kept time at most 5 times larger than the real scale. */
  maxZoom: 5,
  /**
   * The smallest base of a range on the trunk (its branch is this thick at the trunk). Thus a short
   * range does not look like a point.
   */
  minBar: 10,
  /** The width of the trunk: the thick line in the middle. The branches grow from its edge. */
  trunkWidth: 18,
  /**
   * The inner edge of the label cards. The label boxes in `timeline-chart.tsx` have this padding
   * as a Tailwind class (`pl-16`, `pr-16`, and `pl-25` = 36 + 64 px in one column). Change both.
   */
  labelEdge: 64,
  /** The smallest distance between two ticks. */
  minTickSpacing: 56,
  /**
   * A point has a ring on the trunk. A tick chip nearer than 15 px to a ring is left out, because
   * the ring would cover it (half the chip height 9 px + the ring radius 6 px).
   */
  tickClearance: 15,
  /**
   * The date chips of the active entry are 18 px high, like the tick chips. A tick chip nearer than
   * 20 px to a date chip is left out. Two date chips need at least 22 px between their centers.
   */
  dateClearance: 20,
  dateGap: 22,
} as const;

/** `two`: the center line in the middle, entries on both sides. `one`: all entries right of it. */
export type Columns = "one" | "two";

export type Mark = {
  entry: Entry;
  /** The side of the entry in two columns. It gives the color, also in one column. */
  colorSide: ResolvedSide;
  /** Where the picture shows the entry. In one column, this is always `right`. */
  side: ResolvedSide;
  /** The start and the end. A point has `y1 === y2`. */
  y1: number;
  y2: number;
  /** The top of the label. */
  labelTop: number;
};

export type Tick = { y: number; label: string };

/** A cut gap from `top` to `bottom`, with its real length as text ("6 Jahre"). */
export type AxisBreak = { top: number; bottom: number; label: string };

export type Layout = {
  height: number;
  /** The parts of the center line. The scale "real" has one part. */
  segments: { top: number; bottom: number }[];
  breaks: AxisBreak[];
  ticks: Tick[];
  /** The y of today, or `null` if today is not in the time of the entries. */
  today: number | null;
  marks: Mark[];
};

/** The sides of entries in time order. `auto` takes the other side of the entry before it. */
export function resolveSides(entries: readonly Entry[]): ResolvedSide[] {
  let previous: ResolvedSide = "right";
  return entries.map((entry) => {
    const side = entry.side === "auto" ? (previous === "left" ? "right" : "left") : entry.side;
    previous = side;
    return side;
  });
}

/** A time span `from`–`to` (day numbers) that starts at the pixel `top`. */
type Piece = { from: number; to: number; top: number };

/** Maps day numbers to pixels. Between two pieces is a cut gap of `breakHeight` pixels. */
export type TimeScale = { pieces: Piece[]; pixelsPerDay: number };

/** Puts overlapping spans and spans with a short gap into one cluster. */
function clusters(spans: readonly Interval[], maxGap: number): Interval[] {
  const result: Interval[] = [];
  for (const span of [...spans].sort((a, b) => a.from - b.from)) {
    const last = result.at(-1);
    if (last && span.from - last.to <= maxGap) {
      last.to = Math.max(last.to, span.to);
    } else {
      result.push({ ...span });
    }
  }
  return result;
}

/**
 * The scale for the spans. `real`: one piece, the same pixels per day everywhere. `compact`: gaps
 * longer than `breakShare` of the whole time become a cut gap with a fixed height.
 */
export function buildScale(
  spans: readonly Interval[],
  scale: Scale,
  axisLength: number,
): TimeScale {
  const from = Math.min(...spans.map((span) => span.from));
  const to = Math.max(...spans.map((span) => span.to));
  const total = to - from;
  const parts = scale === "compact" ? clusters(spans, total * GEOMETRY.breakShare) : [{ from, to }];
  const kept = parts.reduce((sum, part) => sum + part.to - part.from, 0);
  const free = axisLength - (parts.length - 1) * GEOMETRY.breakHeight;
  // Without a limit, a short kept time (for example 1 day) would fill the whole axis.
  const maxPixelsPerDay = total > 0 ? (axisLength / total) * GEOMETRY.maxZoom : 0;
  const pixelsPerDay = kept > 0 ? Math.min(free / kept, maxPixelsPerDay) : 0;
  let top = GEOMETRY.pad;
  const pieces = parts.map((part) => {
    const piece = { ...part, top };
    top += (part.to - part.from) * pixelsPerDay + GEOMETRY.breakHeight;
    return piece;
  });
  return { pieces, pixelsPerDay };
}

function pieceBottom(piece: Piece, pixelsPerDay: number): number {
  return piece.top + (piece.to - piece.from) * pixelsPerDay;
}

/** The pixel of a day number. A day in a cut gap gets the middle of the gap. */
export function yOf(scale: TimeScale, day: number): number {
  let previous: Piece | null = null;
  for (const piece of scale.pieces) {
    if (day < piece.from) {
      return previous ? (pieceBottom(previous, scale.pixelsPerDay) + piece.top) / 2 : piece.top;
    }
    if (day <= piece.to) return piece.top + (day - piece.from) * scale.pixelsPerDay;
    previous = piece;
  }
  return previous ? pieceBottom(previous, scale.pixelsPerDay) : GEOMETRY.pad;
}

type TickStep = { unit: Precision; size: number; days: number };

const TICK_STEPS: readonly TickStep[] = [
  { unit: "day", size: 1, days: 1 },
  { unit: "day", size: 7, days: 7 },
  ...[1, 3, 6].map((size) => ({ unit: "month" as const, size, days: size * 30.44 })),
  ...[1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].map((size) => ({
    unit: "year" as const,
    size,
    days: size * 365.25,
  })),
];

const MONTHS = [
  "Jan.",
  "Feb.",
  "März",
  "Apr.",
  "Mai",
  "Juni",
  "Juli",
  "Aug.",
  "Sept.",
  "Okt.",
  "Nov.",
  "Dez.",
];

/** The smallest step that keeps ticks at least `minTickSpacing` apart. */
export function tickStep(pixelsPerDay: number): TickStep | null {
  return TICK_STEPS.find((step) => step.days * pixelsPerDay >= GEOMETRY.minTickSpacing) ?? null;
}

/** The tick days from `from` to `to`: each 1st of a month or year, each day or each Monday. */
export function tickDays(step: TickStep, from: number, to: number): number[] {
  const days: number[] = [];
  const start = fromDayNumber(from);
  if (step.unit === "year") {
    let year = Math.ceil(start.year / step.size) * step.size;
    while (dayNumber(year, 1, 1) < from) year += step.size;
    for (; dayNumber(year, 1, 1) <= to; year += step.size) days.push(dayNumber(year, 1, 1));
  } else if (step.unit === "month") {
    let index = Math.ceil((start.year * 12 + start.month - 1) / step.size) * step.size;
    const dayOf = (i: number) => dayNumber(Math.floor(i / 12), (i % 12) + 1, 1);
    while (dayOf(index) < from) index += step.size;
    for (; dayOf(index) <= to; index += step.size) days.push(dayOf(index));
  } else {
    let day = from;
    // Day 0 (1970-01-01) is a Thursday. Thus day + 3 is a multiple of 7 on each Monday.
    while (step.size === 7 && (((day + 3) % 7) + 7) % 7 !== 0) day += 1;
    for (; day <= to; day += step.size) days.push(day);
  }
  return days;
}

/** The text of a tick: "2015", "Apr." (January shows the year) or "14.11.". */
export function tickLabel(step: TickStep, day: number): string {
  const { year, month, day: dayOfMonth } = fromDayNumber(day);
  switch (step.unit) {
    case "year":
      return String(year);
    case "month":
      return month === 1 ? String(year) : (MONTHS[month - 1] ?? "");
    case "day":
      return `${String(dayOfMonth)}.${String(month)}.`;
  }
}

/**
 * The tops of labels on one side. Each label wants to be centered on its `anchor`. Labels that
 * would overlap move apart as a group around the middle of their anchors. No label goes above 0.
 */
export function placeLabels(anchors: readonly number[]): number[] {
  const step = GEOMETRY.labelHeight + GEOMETRY.labelGap;
  // A group of labels: `count` labels from `top`, one `step` apart. `sum` is the sum of
  // (wanted top − index × step). Its mean is the best top of the group.
  const groups: { count: number; sum: number; top: number }[] = [];
  for (const anchor of anchors) {
    const wanted = anchor - GEOMETRY.labelHeight / 2;
    let group = { count: 1, sum: wanted, top: Math.max(0, wanted) };
    let previous = groups.at(-1);
    while (previous && previous.top + previous.count * step > group.top) {
      groups.pop();
      const sum = previous.sum + group.sum - group.count * previous.count * step;
      const count = previous.count + group.count;
      group = { count, sum, top: Math.max(0, sum / count) };
      previous = groups.at(-1);
    }
    groups.push(group);
  }
  return groups.flatMap((group) =>
    Array.from({ length: group.count }, (_, index) => group.top + index * step),
  );
}

/**
 * The layout of the visible entries of a timeline. With `showHidden`, it also places the hidden
 * entries. `today` is a day number.
 */
export function layoutTimeline(
  entries: readonly Entry[],
  scale: Scale,
  today: number,
  columns: Columns,
  showHidden = false,
): Layout {
  const sorted = sortEntries(entries, today);
  // The sides come from all entries. Thus hiding an entry does not move the other entries.
  const allSides = resolveSides(sorted);
  const shown = sorted.flatMap((entry, index) =>
    entry.visible || showHidden ? [{ entry, colorSide: allSides[index] ?? "left" }] : [],
  );
  const visible = shown.map(({ entry }) => entry);
  if (visible.length === 0) {
    return { height: 0, segments: [], breaks: [], ticks: [], today: null, marks: [] };
  }
  const spans = visible.map((entry) => interval(entry.when, today));
  const sideOf = (colorSide: ResolvedSide): ResolvedSide =>
    columns === "one" ? "right" : colorSide;
  const leftCount = shown.filter(({ colorSide }) => sideOf(colorSide) === "left").length;
  const cardStack =
    Math.max(leftCount, shown.length - leftCount) * (GEOMETRY.labelHeight + GEOMETRY.labelGap);
  const axisLength = Math.max(
    cardStack,
    Math.min(GEOMETRY.maxAxis, Math.max(GEOMETRY.minAxis, visible.length * GEOMETRY.perEntry)),
  );
  const timeScale = buildScale(spans, scale, axisLength);
  const { pieces, pixelsPerDay } = timeScale;

  const segments = pieces.map((piece) => ({
    top: piece.top,
    bottom: pieceBottom(piece, pixelsPerDay),
  }));
  const breaks = pieces.slice(1).flatMap((piece, index) => {
    const before = pieces[index];
    if (!before) return [];
    return [
      {
        top: pieceBottom(before, pixelsPerDay),
        bottom: piece.top,
        label: formatDuration(piece.from - before.to),
      },
    ];
  });

  const step = tickStep(pixelsPerDay);
  const ticks = step
    ? pieces.flatMap((piece) =>
        tickDays(step, piece.from, piece.to).map((day) => ({
          y: yOf(timeScale, day),
          label: tickLabel(step, day),
        })),
      )
    : [];

  const placed = visible.map((entry, index) => {
    const span = spans[index] ?? { from: 0, to: 0 };
    const y1 = yOf(timeScale, span.from);
    const isPoint = entry.when.kind === "point";
    const y2 = isPoint ? y1 : Math.max(yOf(timeScale, span.to), y1 + GEOMETRY.minBar);
    const colorSide = shown[index]?.colorSide ?? "left";
    const side = sideOf(colorSide);
    return { entry, colorSide, side, y1, y2 };
  });

  const marks: Mark[] = [];
  for (const side of RESOLVED_SIDES) {
    const onSide = placed.filter((mark) => mark.side === side);
    const tops = placeLabels(onSide.map((mark) => mark.y1));
    onSide.forEach((mark, index) => {
      marks.push({
        entry: mark.entry,
        colorSide: mark.colorSide,
        side,
        y1: mark.y1,
        y2: mark.y2,
        labelTop: tops[index] ?? 0,
      });
    });
  }

  const first = Math.min(...spans.map((span) => span.from));
  const last = Math.max(...spans.map((span) => span.to));
  const axisBottom = segments.at(-1)?.bottom ?? GEOMETRY.pad;
  const labelBottom = Math.max(...marks.map((mark) => mark.labelTop + GEOMETRY.labelHeight));
  return {
    height: Math.ceil(Math.max(axisBottom + GEOMETRY.pad, labelBottom + GEOMETRY.labelGap)),
    segments,
    breaks,
    ticks: ticks.filter((tick) =>
      marks.every(
        (placed) =>
          placed.entry.when.kind !== "point" ||
          Math.abs(placed.y1 - tick.y) >= GEOMETRY.tickClearance,
      ),
    ),
    today: today >= first && today <= last ? yOf(timeScale, today) : null,
    marks,
  };
}

/** A date chip of the active entry on the trunk. */
export type DateChip = { y: number; label: string };

/**
 * The date chips of an entry, at the places where its branch touches the trunk: the start and the
 * end of a range, or the day of a point. An ongoing range has only its start: "Heute" is its end.
 * If the start and the end of a range are too near, one chip shows the whole range.
 */
export function dateChips(mark: Mark): DateChip[] {
  const { when } = mark.entry;
  switch (when.kind) {
    case "point":
      return [{ y: mark.y1, label: formatPartial(when.date) }];
    case "ongoing":
      return [{ y: mark.y1, label: formatPartial(when.start) }];
    case "range":
      if (mark.y2 - mark.y1 < GEOMETRY.dateGap) {
        return [{ y: (mark.y1 + mark.y2) / 2, label: formatWhen(when) }];
      }
      return [
        { y: mark.y1, label: formatPartial(when.start) },
        { y: mark.y2, label: formatPartial(when.end) },
      ];
  }
}
