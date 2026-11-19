import type { Migration } from "@pocket-apps/core/data-file";
import { z } from "zod";

/** The data of schema version 2. Only a new field comes. */
const v2 = z.looseObject({ workouts: z.array(z.unknown()), results: z.array(z.unknown()) });

/**
 * Version 3 keeps which loads the built-in workouts show: for men or for women (`loadsFor`).
 * Before, the texts showed both ("43/29 kg"). The migration starts with the loads for men.
 */
export const toV3: Migration = (data) => ({ ...v2.parse(data), loadsFor: "men" });
