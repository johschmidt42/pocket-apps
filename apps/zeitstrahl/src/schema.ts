import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";
import { MONTH_PATTERN, YEAR_PATTERN } from "./dates.ts";

/** A day ("2026-11-14"), a month ("2026-11") or a year ("2026"). */
const partialDateSchema = z.union([
  z.iso.date(),
  z.string().regex(MONTH_PATTERN),
  z.string().regex(YEAR_PATTERN),
]);

const whenSchema = z.discriminatedUnion("kind", [
  /** One moment, for example a doctor's appointment. */
  z.object({ kind: z.literal("point"), date: partialDateSchema }),
  /** A range with a start and an end. The end is the last day, month or year of the range. */
  z.object({ kind: z.literal("range"), start: partialDateSchema, end: partialDateSchema }),
  /** A range from `start` until today ("seit 11/2018"). */
  z.object({ kind: z.literal("ongoing"), start: partialDateSchema }),
]);

export const SIDES = ["auto", "left", "right"] as const;
export const SCALES = ["real", "compact"] as const;
/** The colors of the trunk. A click on the trunk takes the next one. Gray is the default. */
export const TRUNK_COLORS = ["gray", "green", "purple", "pink", "yellow", "red"] as const;

const entrySchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  /** Optional. An empty text means: no description. */
  description: z.string(),
  when: whenSchema,
  /** The side of the vertical line. `auto`: the other side of the entry before it. */
  side: z.enum(SIDES),
  /** `false`: the timeline shows the entry only while "Ausgeblendete zeigen" is on. */
  visible: z.boolean(),
});

const timelineSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  /** `real`: real distances. `compact`: long empty gaps are cut short. */
  scale: z.enum(SCALES),
  trunk: z.enum(TRUNK_COLORS),
  entries: z.array(entrySchema),
});

const zeitstrahlSchema = z
  .object({
    timelines: z.array(timelineSchema).min(1),
    activeTimelineId: z.string(),
  })
  .refine((data) => data.timelines.some((timeline) => timeline.id === data.activeTimelineId), {
    message: "activeTimelineId must be the ID of a timeline.",
  });

export type When = z.infer<typeof whenSchema>;
export type Side = z.infer<typeof entrySchema>["side"];
export type Scale = z.infer<typeof timelineSchema>["scale"];
export type TrunkColor = z.infer<typeof timelineSchema>["trunk"];
export type Entry = z.infer<typeof entrySchema>;
export type Timeline = z.infer<typeof timelineSchema>;
export type ZeitstrahlData = z.infer<typeof zeitstrahlSchema>;

/** A new file has one empty timeline. While no timeline has an entry, the app shows an example. */
export function initialData(newId: () => string): ZeitstrahlData {
  const id = newId();
  return {
    activeTimelineId: id,
    timelines: [{ id, name: "Mein Zeitstrahl", scale: "real", trunk: "gray", entries: [] }],
  };
}

export const schema = defineDataSchema<ZeitstrahlData>({
  app: "zeitstrahl",
  validate: zeitstrahlSchema,
  initial: () => initialData(() => crypto.randomUUID()),
  // Version 1 has no migrations. Append new ones at the end. Never change old ones.
  migrations: [],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
