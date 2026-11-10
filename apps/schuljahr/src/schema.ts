import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";
import { stateCodeSchema } from "./states.ts";

const holidaySchema = z.object({
  /** The ID of OpenHolidays. */
  id: z.string().min(1),
  /** "school": school holidays or a day without school. "public": a public holiday. */
  kind: z.enum(["school", "public"]),
  /** The German name, for example "Herbstferien" or "Allerheiligen". */
  name: z.string().min(1),
  start: z.iso.date(),
  /** The last day. It is the same as `start` for one day. */
  end: z.iso.date(),
});

/** One state in one school year. */
const selectionSchema = z.object({
  state: stateCodeSchema,
  /** 2026 for the school year 2026/27. */
  startYear: z.number().int().min(2000).max(2100),
});

/** The holidays of one state in one school year, as the app loaded them from OpenHolidays. */
const schoolYearSchema = selectionSchema.extend({
  fetchedAt: z.iso.datetime(),
  /** From August 1 of the start year to September 30 of the next year. Oldest first. */
  holidays: z.array(holidaySchema),
});

const schuljahrSchema = z.object({
  /** The school year on the screen. `null` before the first load. */
  selected: selectionSchema.nullable(),
  /** All loaded school years. The app reads them from here, not from the internet. */
  years: z.array(schoolYearSchema),
});

export type Holiday = z.infer<typeof holidaySchema>;
export type SchoolYear = z.infer<typeof schoolYearSchema>;
export type Selection = z.infer<typeof selectionSchema>;
export type SchuljahrData = z.infer<typeof schuljahrSchema>;

export const schema = defineDataSchema<SchuljahrData>({
  app: "schuljahr",
  validate: schuljahrSchema,
  initial: () => ({ selected: null, years: [] }),
  // Append new migrations at the end. Never change old ones.
  migrations: [],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
