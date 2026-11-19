import type { Migration } from "@pocket-apps/core/data-file";
import { z } from "zod";

/** The data of schema version 1. Only the parts of the own workouts change. */
const v1 = z.looseObject({
  workouts: z.array(z.looseObject({ parts: z.array(z.looseObject({})) })),
});

/**
 * Version 2 keeps the box height of each part in inches (`boxInches`). Version 1 has no box
 * height, so the migration sets it to `null`. The user adds it in the form.
 */
export const toV2: Migration = (data) => {
  const old = v1.parse(data);
  return {
    ...old,
    workouts: old.workouts.map((workout) => ({
      ...workout,
      parts: workout.parts.map((part) => ({ ...part, boxInches: null })),
    })),
  };
};
