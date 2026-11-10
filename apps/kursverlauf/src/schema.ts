import { createDataFileStore, defineDataSchema } from "@pocket-apps/core/data-file";
import { z } from "zod";
import { toV2 } from "./migrations/to-v2.ts";

/** The most ETFs in the app. There are 8 chart colors, and each ETF costs one request per day. */
export const MAX_ETFS = 8;

const etfSchema = z.object({
  id: z.string().min(1),
  /** Empty if the user added the ETF by its ticker. */
  isin: z.string(),
  /** The Alpha Vantage symbol, for example "SPYI.DEX" (Xetra). */
  symbol: z.string().min(1),
  name: z.string().trim().min(1),
});

const pointSchema = z.object({
  date: z.iso.date(),
  /** The weekly close in EUR, without dividends, adjusted for splits. */
  close: z.number().positive(),
  /** The weekly close in EUR, adjusted for splits and dividends: the value with dividends paid back in. */
  total: z.number().positive(),
});

/** The last download of one ETF. Each download replaces the one before. */
const pricesSchema = z.object({
  fetchedAt: z.iso.datetime(),
  /** Oldest first. */
  points: z.array(pointSchema),
});

const kursverlaufSchema = z.object({
  /** The Alpha Vantage key of the user. Empty until the user types it in. */
  apiKey: z.string(),
  /** The order of the array is the order on the screen and of the chart colors. */
  etfs: z.array(etfSchema).max(MAX_ETFS),
  /** The key is the symbol of the ETF. */
  prices: z.record(z.string(), pricesSchema),
});

export type Etf = z.infer<typeof etfSchema>;
export type PricePoint = z.infer<typeof pointSchema>;
export type Prices = z.infer<typeof pricesSchema>;
export type KursverlaufData = z.infer<typeof kursverlaufSchema>;

export const schema = defineDataSchema<KursverlaufData>({
  app: "kursverlauf",
  validate: kursverlaufSchema,
  initial: () => ({ apiKey: "", etfs: [], prices: {} }),
  // Append new migrations at the end. Never change old ones.
  migrations: [toV2],
});

export const { DataFileProvider, useDataFile } = createDataFileStore(schema, {
  app: __POCKET_APP__,
});
