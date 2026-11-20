import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";

const purchaseSchema = z.object({
  id: z.string().min(1),
  /** The day of the purchase. */
  date: z.iso.date(),
  name: z.string().trim().min(1),
  /** The paid price in cent. Integers avoid rounding errors. */
  priceCents: z.number().int().nonnegative(),
  /** The Steam app ID for the picture, or `null` without a picture. */
  appId: z.number().int().positive().nullable(),
});

const purchaseListSchema = z.object({
  purchases: z.array(purchaseSchema),
});

export type Purchase = z.infer<typeof purchaseSchema>;
export type PurchaseList = z.infer<typeof purchaseListSchema>;

export const schema = defineDataSchema<PurchaseList>({
  app: "spielekaeufe",
  validate: purchaseListSchema,
  initial: () => ({ purchases: [] }),
  // Version 1 has no migrations. Append new ones at the end. Never change old ones.
  migrations: [],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
