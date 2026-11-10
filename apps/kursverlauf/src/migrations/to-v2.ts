import type { Migration } from "@pocket-apps/core/data-file";
import { z } from "zod";

/** The data of schema version 1. The stored prices are only a copy of Alpha Vantage. */
const v1 = z.object({
  apiKey: z.string(),
  etfs: z.array(z.unknown()),
  prices: z.record(z.string(), z.unknown()),
});

/**
 * Version 2 stores a second value per price: the close with dividends.
 * Version 1 has no such value, so the migration removes the stored prices. The app loads them again.
 */
export const toV2: Migration = (data) => {
  const old = v1.parse(data);
  return { apiKey: old.apiKey, etfs: old.etfs, prices: {} };
};
