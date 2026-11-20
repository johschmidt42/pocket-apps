import type { Migration } from "@pocket-apps/core/data-file";
import { z } from "zod";

/** The data of schema version 2. Only the parts of the own workouts and a new field change. */
const v2 = z.looseObject({
  workouts: z.array(z.looseObject({ parts: z.array(z.looseObject({})) })),
  results: z.array(z.unknown()),
});

/**
 * Version 3 has loads for men and for women:
 * - `loadsFor`: which loads the texts show. The migration starts with the loads for men.
 * - Each part of an own workout has `kgWomen` and `boxInchesWomen`. Version 2 has one value for
 *   all, so the migration sets them to `null`: the same for all.
 */
export const toV3: Migration = (data) => {
  const old = v2.parse(data);
  return {
    ...old,
    workouts: old.workouts.map((workout) => ({
      ...workout,
      parts: workout.parts.map((part) => ({ ...part, kgWomen: null, boxInchesWomen: null })),
    })),
    loadsFor: "men",
  };
};
