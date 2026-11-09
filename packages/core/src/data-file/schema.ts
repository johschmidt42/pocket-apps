import type { z } from "zod";

/** Upgrades the data by exactly one version. */
export type Migration = (data: unknown) => unknown;

export type DataSchema<T> = {
  /** App ID. It must match the `app` field in the data file. */
  app: string;
  /** Validates the data after all migrations. */
  validate: z.ZodType<T>;
  /** The data of a new, empty file. */
  initial: () => T;
  /**
   * Forward-only migrations. `migrations[0]` upgrades version 1 to 2,
   * `migrations[1]` upgrades version 2 to 3, and so on.
   * Never change or remove a migration. Only append new ones.
   */
  migrations: readonly Migration[];
};

export function defineDataSchema<T>(schema: DataSchema<T>): DataSchema<T> {
  return schema;
}

/** The current schema version: 1 + number of migrations. */
export function currentVersion(schema: DataSchema<unknown>): number {
  return schema.migrations.length + 1;
}
