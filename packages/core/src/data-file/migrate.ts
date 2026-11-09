import { parseEnvelope } from "./envelope.ts";
import { DataFileError } from "./errors.ts";
import { currentVersion, type DataSchema } from "./schema.ts";

export type LoadResult<T> = {
  data: T;
  /** The old schema version, if the data was migrated. Otherwise `null`. */
  migratedFrom: number | null;
};

/** Reads a data file, runs all open migrations and validates the result. */
export function loadData<T>(text: string, schema: DataSchema<T>): LoadResult<T> {
  const envelope = parseEnvelope(text);

  if (envelope.app !== schema.app) {
    throw new DataFileError(
      "wrong-app",
      `Diese Datei gehört zur App „${envelope.app}“, nicht zu „${schema.app}“.`,
    );
  }

  const target = currentVersion(schema);
  if (envelope.schemaVersion > target) {
    throw new DataFileError(
      "too-new",
      `Die Datei wurde mit einer neueren App-Version (${envelope.savedWith}) gespeichert. Bitte verwende die neueste Version der App.`,
    );
  }

  let data = envelope.data;
  for (let version = envelope.schemaVersion; version < target; version++) {
    const migration = schema.migrations[version - 1];
    if (!migration) {
      throw new DataFileError(
        "missing-migration",
        `Es fehlt die Migration von Version ${String(version)} auf ${String(version + 1)}.`,
      );
    }
    data = migration(data);
  }

  const result = schema.validate.safeParse(data);
  if (!result.success) {
    throw new DataFileError("invalid-data", "Die Daten in der Datei sind fehlerhaft.");
  }

  return {
    data: result.data,
    migratedFrom: envelope.schemaVersion < target ? envelope.schemaVersion : null,
  };
}
