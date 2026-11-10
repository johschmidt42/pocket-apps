import type { Migration } from "@pocket-apps/core/data-file";
import { z } from "zod";

/** The data of schema version 1: only the order of the apps. */
const v1 = z.object({ order: z.array(z.string()) });

/** Version 2 adds the favorite apps. Old files have no favorites. */
export const toV2: Migration = (data) => ({ ...v1.parse(data), favorites: [] });
