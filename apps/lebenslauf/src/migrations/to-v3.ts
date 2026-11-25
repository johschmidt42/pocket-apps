import type { Migration } from "@pocket-apps/core/data-file";
import { z } from "zod";

/** A section of schema version 2. Only the kind and the entries matter here. */
const v2Section = z.looseObject({
  kind: z.enum(["projects", "stations", "list"]),
  entries: z.array(z.looseObject({})),
});

/** The data of schema version 2: the designs "klassisch" and "modern". */
const v2 = z.object({
  person: z.unknown(),
  variants: z.array(
    z.looseObject({
      design: z.enum(["klassisch", "modern"]),
      sections: z.array(v2Section),
    }),
  ),
  activeVariantId: z.string(),
});

/**
 * Version 3 gives each variant a profile and each project a role, a client and a time range, and
 * adds the design "projektprofil". An old variant gets an empty profile. An old project gets an
 * empty role and client and no time range.
 */
export const toV3: Migration = (data) => {
  const old = v2.parse(data);
  return {
    person: old.person,
    variants: old.variants.map((variant) => ({
      ...variant,
      profile: "",
      sections: variant.sections.map((section) =>
        section.kind === "projects"
          ? {
              ...section,
              entries: section.entries.map((project) => ({
                ...project,
                role: "",
                client: "",
                from: null,
                to: null,
              })),
            }
          : section,
      ),
    })),
    activeVariantId: old.activeVariantId,
  };
};
