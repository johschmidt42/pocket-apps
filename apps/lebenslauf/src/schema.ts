import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";
import { toV2 } from "./migrations/to-v2.ts";

/** The languages of the fixed words of a design, for example "Description" or "Beschreibung". */
export const LANGUAGES = ["de", "en"] as const;

/** The kinds of contact lines. Each kind has its own icon in the design. */
export const CONTACT_KINDS = [
  "email",
  "website",
  "linkedin",
  "github",
  "phone",
  "location",
] as const;

/** The kinds of sections. All designs show the same kinds. */
export const SECTION_KINDS = ["projects", "stations", "list"] as const;

/** A month, for example "2024-01". */
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthSchema = z.string().regex(MONTH_PATTERN, "Use a month like 2024-01.");

/** A list of short texts, for example the tasks of a project. Each item is one line. */
const linesSchema = z.array(z.string().trim().min(1));

const contactSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(CONTACT_KINDS),
  /** Can be empty while the user types. The CV leaves out empty lines. */
  value: z.string(),
});

/** The data that all variants share. */
const personSchema = z.object({
  /** Can be empty while the user types. */
  name: z.string(),
  /** The order of the array is the order in the CV. */
  contacts: z.array(contactSchema),
});

const projectSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string(),
  tasks: linesSchema,
  tools: linesSchema,
});

const stationSchema = z
  .object({
    id: z.string().min(1),
    from: monthSchema,
    /** `null`: the station did not end yet ("Since 01/2024"). */
    to: monthSchema.nullable(),
    title: z.string().trim().min(1),
    /** Shown after the title, for example the company. */
    subtitle: z.string(),
    bullets: linesSchema,
  })
  .refine((station) => station.to === null || station.to >= station.from, {
    message: "The end must not be before the start.",
  });

const listRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1),
  items: linesSchema,
});

const sectionFields = { id: z.string().min(1), title: z.string().trim().min(1) };

const sectionSchema = z.discriminatedUnion("kind", [
  z.object({ ...sectionFields, kind: z.literal("projects"), entries: z.array(projectSchema) }),
  z.object({ ...sectionFields, kind: z.literal("stations"), entries: z.array(stationSchema) }),
  z.object({ ...sectionFields, kind: z.literal("list"), entries: z.array(listRowSchema) }),
]);

const variantFields = {
  id: z.string().min(1),
  name: z.string().trim().min(1),
  language: z.enum(LANGUAGES),
  /**
   * The file name of the photo in the folder of the app (`foto-<variant ID>.jpg`), or
   * `null`. A file without the field has no photo.
   */
  photo: z.string().min(1).nullable().default(null),
};

/** The designs of the CV. Each design shows the same sections in its own look. */
export const DESIGN_NAMES = ["klassisch", "modern"] as const;

/**
 * A variant of the CV, for example for one job ad. All designs use the same sections, so a
 * variant can change its design. A design with other fields would need a union here.
 */
const variantSchema = z.object({
  ...variantFields,
  design: z.enum(DESIGN_NAMES),
  /** The order of the array is the order in the CV. */
  sections: z.array(sectionSchema),
});

const lebenslaufSchema = z
  .object({
    person: personSchema,
    variants: z.array(variantSchema).min(1),
    activeVariantId: z.string(),
  })
  .refine((data) => data.variants.some((variant) => variant.id === data.activeVariantId), {
    message: "activeVariantId must be the ID of a variant.",
  });

export type Language = (typeof LANGUAGES)[number];
export type ContactKind = (typeof CONTACT_KINDS)[number];
export type SectionKind = (typeof SECTION_KINDS)[number];
export type Contact = z.infer<typeof contactSchema>;
export type Person = z.infer<typeof personSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Station = z.infer<typeof stationSchema>;
export type ListRow = z.infer<typeof listRowSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type Design = (typeof DESIGN_NAMES)[number];
export type LebenslaufData = z.infer<typeof lebenslaufSchema>;

/** A new file has one empty variant with the design "klassisch". */
export function initialData(id: string = crypto.randomUUID()): LebenslaufData {
  return {
    person: { name: "", contacts: [] },
    variants: [
      {
        id,
        name: "Mein Lebenslauf",
        language: "de",
        design: "klassisch",
        photo: null,
        sections: [],
      },
    ],
    activeVariantId: id,
  };
}

export const schema = defineDataSchema<LebenslaufData>({
  app: "lebenslauf",
  validate: lebenslaufSchema,
  initial: () => initialData(),
  // Append new migrations at the end. Never change old ones.
  migrations: [toV2],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
