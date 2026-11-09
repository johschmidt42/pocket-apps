import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";

const ideaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
});

const ideaListSchema = z.object({
  /** The order of the array is the order on the screen. */
  ideas: z.array(ideaSchema),
});

export type Idea = z.infer<typeof ideaSchema>;
export type IdeaList = z.infer<typeof ideaListSchema>;

export const schema = defineDataSchema<IdeaList>({
  app: "app-ideen",
  validate: ideaListSchema,
  initial: () => ({ ideas: [] }),
  // Version 1 has no migrations. Append new ones at the end. Never change old ones.
  migrations: [],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
