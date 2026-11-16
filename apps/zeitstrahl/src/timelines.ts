import { interval, precisionOf, type Precision } from "./dates.ts";
import {
  TRUNK_COLORS,
  type Entry,
  type Scale,
  type Timeline,
  type ZeitstrahlData,
} from "./schema.ts";

/** The timeline that the app shows. */
export function activeTimeline(data: ZeitstrahlData): Timeline {
  const found =
    data.timelines.find((timeline) => timeline.id === data.activeTimelineId) ?? data.timelines[0];
  // The schema makes sure that there is at least one timeline.
  if (!found) throw new Error("The data has no timeline.");
  return found;
}

function mapTimeline(
  data: ZeitstrahlData,
  id: string,
  change: (timeline: Timeline) => Timeline,
): ZeitstrahlData {
  return {
    ...data,
    timelines: data.timelines.map((timeline) => (timeline.id === id ? change(timeline) : timeline)),
  };
}

export function selectTimeline(data: ZeitstrahlData, id: string): ZeitstrahlData {
  return data.timelines.some((timeline) => timeline.id === id)
    ? { ...data, activeTimelineId: id }
    : data;
}

/** Adds an empty timeline at the end and shows it. */
export function addTimeline(data: ZeitstrahlData, name: string, id: string): ZeitstrahlData {
  return {
    timelines: [...data.timelines, { id, name, scale: "real", trunk: "gray", entries: [] }],
    activeTimelineId: id,
  };
}

export function renameTimeline(data: ZeitstrahlData, id: string, name: string): ZeitstrahlData {
  return mapTimeline(data, id, (timeline) => ({ ...timeline, name }));
}

/** Removes a timeline. The last timeline stays. The app then shows the first timeline. */
export function removeTimeline(data: ZeitstrahlData, id: string): ZeitstrahlData {
  const timelines = data.timelines.filter((timeline) => timeline.id !== id);
  const [first] = timelines;
  if (!first) return data;
  const activeTimelineId = timelines.some((timeline) => timeline.id === data.activeTimelineId)
    ? data.activeTimelineId
    : first.id;
  return { timelines, activeTimelineId };
}

export function setScale(data: ZeitstrahlData, id: string, scale: Scale): ZeitstrahlData {
  return mapTimeline(data, id, (timeline) => ({ ...timeline, scale }));
}

/** Gives the trunk of the timeline the next color. After the last color, it starts again. */
export function nextTrunkColor(data: ZeitstrahlData, id: string): ZeitstrahlData {
  return mapTimeline(data, id, (timeline) => {
    const index = TRUNK_COLORS.indexOf(timeline.trunk);
    return { ...timeline, trunk: TRUNK_COLORS[(index + 1) % TRUNK_COLORS.length] ?? "gray" };
  });
}

/** Adds the entry, or replaces the entry with the same ID. */
export function upsertEntry(
  data: ZeitstrahlData,
  timelineId: string,
  entry: Entry,
): ZeitstrahlData {
  return mapTimeline(data, timelineId, (timeline) => ({
    ...timeline,
    entries: timeline.entries.some((existing) => existing.id === entry.id)
      ? timeline.entries.map((existing) => (existing.id === entry.id ? entry : existing))
      : [...timeline.entries, entry],
  }));
}

export function removeEntry(
  data: ZeitstrahlData,
  timelineId: string,
  entryId: string,
): ZeitstrahlData {
  return mapTimeline(data, timelineId, (timeline) => ({
    ...timeline,
    entries: timeline.entries.filter((entry) => entry.id !== entryId),
  }));
}

/** Shows a hidden entry, or hides a shown entry. */
export function toggleEntry(
  data: ZeitstrahlData,
  timelineId: string,
  entryId: string,
): ZeitstrahlData {
  return mapTimeline(data, timelineId, (timeline) => ({
    ...timeline,
    entries: timeline.entries.map((entry) =>
      entry.id === entryId ? { ...entry, visible: !entry.visible } : entry,
    ),
  }));
}

/** The entries in time order: by start, then by end. Entries with the same time keep their order. */
export function sortEntries(entries: readonly Entry[], today: number): Entry[] {
  return entries
    .map((entry) => ({ entry, time: interval(entry.when, today) }))
    .sort((a, b) => a.time.from - b.time.from || a.time.to - b.time.to)
    .map(({ entry }) => entry);
}

/** True if the entry has a description. */
export function hasDescription(entry: Entry): boolean {
  return entry.description.trim() !== "";
}

/** The first date of an entry. */
export function startOf(entry: Entry): string {
  return entry.when.kind === "point" ? entry.when.date : entry.when.start;
}

/** The precision for a new entry: the precision of the newest entry, else "day". */
export function defaultPrecision(entries: readonly Entry[]): Precision {
  const newest = entries.at(-1);
  return newest ? precisionOf(startOf(newest)) : "day";
}
