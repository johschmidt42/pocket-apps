import type { Migration } from "@pocket-apps/core/data-file";
import { z } from "zod";

/** The data of schema version 2. The stored prices are only a copy of Alpha Vantage. */
const v2 = z.object({
  apiKey: z.string(),
  etfs: z.array(z.unknown()),
  prices: z.record(z.string(), z.unknown()),
});

/**
 * Version 3 stores the dividends of each ETF. Version 2 has no dividends,
 * so the migration removes the stored prices. The app loads them again.
 */
export const toV3: Migration = (data) => {
  const old = v2.parse(data);
  return { apiKey: old.apiKey, etfs: old.etfs, prices: {} };
};
