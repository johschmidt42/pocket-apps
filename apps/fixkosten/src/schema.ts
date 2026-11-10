import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";
import { MAX_CENTS } from "./money.ts";

export const INTERVALS = ["monthly", "quarterly", "half-yearly", "yearly"] as const;

/** The categories of a cost. The order is the order of the chart colors. */
export const CATEGORIES = [
  "housing",
  "energy",
  "communication",
  "mobility",
  "insurance",
  "health",
  "savings",
  "household",
  "other",
] as const;

/** The icons that a cost can have. `icons.ts` gives each one a lucide icon and a German label. */
export const ICON_NAMES = [
  "house",
  "building",
  "landmark",
  "zap",
  "flame",
  "droplet",
  "wifi",
  "smartphone",
  "tv",
  "music",
  "radio",
  "newspaper",
  "cloud",
  "gamepad",
  "car",
  "fuel",
  "train",
  "bike",
  "shield",
  "heart-pulse",
  "dumbbell",
  "pill",
  "piggy-bank",
  "trending-up",
  "users",
  "shopping-cart",
  "baby",
  "dog",
  "cat",
  "graduation-cap",
  "gift",
  "wallet",
  "receipt",
] as const;

const entryFields = {
  id: z.string().min(1),
  name: z.string().trim().min(1),
  /** The amount of one payment, in cents. */
  amountCents: z.number().int().min(0).max(MAX_CENTS),
  interval: z.enum(INTERVALS),
  /** The month of a payment (1 = January). Monthly entries ignore it. */
  dueMonth: z.number().int().min(1).max(12),
};

const incomeSchema = z.object(entryFields);

const costSchema = z.object({
  ...entryFields,
  category: z.enum(CATEGORIES),
  icon: z.enum(ICON_NAMES),
});

const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  /** The order of the array is the order on the screen. */
  incomes: z.array(incomeSchema),
  costs: z.array(costSchema),
});

const fixkostenSchema = z
  .object({
    profiles: z.array(profileSchema).min(1),
    activeProfileId: z.string(),
  })
  .refine((data) => data.profiles.some((profile) => profile.id === data.activeProfileId), {
    message: "activeProfileId must be the ID of a profile.",
  });

export type Interval = (typeof INTERVALS)[number];
export type Category = (typeof CATEGORIES)[number];
export type IconName = (typeof ICON_NAMES)[number];
export type Income = z.infer<typeof incomeSchema>;
export type Cost = z.infer<typeof costSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type FixkostenData = z.infer<typeof fixkostenSchema>;

/** A new file has one empty profile. */
export function initialData(id: string = crypto.randomUUID()): FixkostenData {
  return { profiles: [{ id, name: "Mein Haushalt", incomes: [], costs: [] }], activeProfileId: id };
}

export const schema = defineDataSchema<FixkostenData>({
  app: "fixkosten",
  validate: fixkostenSchema,
  initial: () => initialData(),
  // Version 1 has no migrations. Append new ones at the end. Never change old ones.
  migrations: [],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
