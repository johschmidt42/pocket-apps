import { DataFileError } from "./errors.ts";
import type { DataFolder } from "./folder.ts";

/**
 * The extra files of an app: files in the folder of the app besides its data file, for example
 * the photo of a CV. The folder of the app is `<app>/` in the data folder.
 */
export type ExtraFiles = {
  /** The content of the file, or `null` if it does not exist. */
  read: (name: string) => Promise<Blob | null>;
  /** Writes the file. An existing file with the same name is replaced. */
  write: (name: string, content: Blob) => Promise<void>;
  /** Deletes the file. Does nothing if the file does not exist. */
  remove: (name: string) => Promise<void>;
};

/** Lowercase letters, digits and hyphens, then one extension. No folders. */
const NAME_PATTERN = /^[a-z0-9-]+\.[a-z0-9]+$/;

/**
 * True if `name` is a valid name for an extra file of the app `app`. The names of the data
 * file and its backups (`<app>.json`, `<app>.backup-v1.json`) are not allowed.
 */
export function isExtraFileName(app: string, name: string): boolean {
  return NAME_PATTERN.test(name) && !name.startsWith(`${app}.`);
}

/** The extra files of the app `app` in `folder`. A wrong name gives an error. */
export function extraFiles(folder: DataFolder, app: string): ExtraFiles {
  function path(name: string): string {
    if (!isExtraFileName(app, name)) {
      throw new DataFileError(
        "invalid-file-name",
        `„${name}“ ist kein erlaubter Dateiname für eine Zusatzdatei der App „${app}“.`,
      );
    }
    return `${app}/${name}`;
  }
  return {
    // async: a wrong name gives a rejected promise, not an exception at the call.
    read: async (name) => folder.readBlob(path(name)),
    write: async (name, content) => {
      await folder.write(path(name), content);
    },
    remove: async (name) => {
      await folder.remove(path(name));
    },
  };
}
