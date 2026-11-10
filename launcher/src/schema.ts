import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";

const launcherSchema = z.object({
  /** App names in the order of the person. Apps that are not in the list come after them. */
  order: z.array(z.string()),
});

export type LauncherData = z.infer<typeof launcherSchema>;

export const schema = defineDataSchema<LauncherData>({
  app: "launcher",
  validate: launcherSchema,
  initial: () => ({ order: [] }),
  // Version 1 has no migrations. Append new ones at the end. Never change old ones.
  migrations: [],
});

// The launcher also works without a data folder. Then it shows the apps in the build order.
export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
  folderOptional: true,
});
