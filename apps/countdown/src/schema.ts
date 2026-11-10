import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";

const eventSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  /** The day of the event, in local time. */
  date: z.iso.date(),
  /** The time of the event ("14:30"), in local time. `null`: the start of the day (0:00). */
  time: z.iso.time({ precision: -1 }).nullable(),
  /** When the user added the event. The progress bar starts here. */
  createdAt: z.iso.datetime(),
});

const countdownSchema = z.object({
  events: z.array(eventSchema),
});

export type CountdownEvent = z.infer<typeof eventSchema>;
export type CountdownData = z.infer<typeof countdownSchema>;

/** A new file has one event: the end of the current year (midnight on New Year's Eve). */
export function initialData(now: Date, id: string): CountdownData {
  const year = now.getFullYear();
  return {
    events: [
      {
        id,
        name: `Jahresende ${String(year)}`,
        date: `${String(year + 1)}-01-01`,
        time: null,
        createdAt: now.toISOString(),
      },
    ],
  };
}

export const schema = defineDataSchema<CountdownData>({
  app: "countdown",
  validate: countdownSchema,
  initial: () => initialData(new Date(), crypto.randomUUID()),
  // Version 1 has no migrations. Append new ones at the end. Never change old ones.
  migrations: [],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
