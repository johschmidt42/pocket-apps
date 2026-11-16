import type { Migration } from "@pocket-apps/core/data-file";
import { z } from "zod";

/** The data of schema version 1: each variant has the design "klassisch". */
const v1 = z.object({
  person: z.unknown(),
  variants: z.array(z.looseObject({ design: z.literal("klassisch") })),
  activeVariantId: z.string(),
});

/**
 * Version 2 adds the design "modern". The data does not change. The new version number only
 * stops an older app version: it must not read a variant with a design that it does not know.
 */
export const toV2: Migration = (data) => {
  const old = v1.parse(data);
  return { person: old.person, variants: old.variants, activeVariantId: old.activeVariantId };
};
