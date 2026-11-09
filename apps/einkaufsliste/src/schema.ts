import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  done: z.boolean(),
});

const shoppingListSchema = z.object({
  items: z.array(itemSchema),
});

export type Item = z.infer<typeof itemSchema>;
export type ShoppingList = z.infer<typeof shoppingListSchema>;

export const schema = defineDataSchema<ShoppingList>({
  app: "einkaufsliste",
  validate: shoppingListSchema,
  initial: () => ({ items: [] }),
  // Version 1 has no migrations. Append new ones at the end. Never change old ones.
  migrations: [],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
