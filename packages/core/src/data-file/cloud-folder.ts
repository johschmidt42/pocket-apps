// The parts that the data folders of all cloud storages share.
import type { CloudSession } from "./cloud-login.ts";
import type { DataFolder, FileSnapshot, WriteResult } from "./folder.ts";

/** The message when `write()` finds that the file changed after the last check. */
const CHANGED_ELSEWHERE =
  "Die Datei hat sich gerade woanders geändert. Lade die Seite neu und versuche es noch einmal.";

/**
 * Reads a file of a cloud storage: first the time, then the text. If the file changes in between,
 * the time is older than the text. Then the next save shows a conflict and loses nothing. The
 * other order could overwrite the change of another device.
 */
export async function readTimeThenText(
  path: string,
  lastModified: (path: string) => Promise<number | null>,
  readBlob: (path: string) => Promise<Blob | null>,
): Promise<FileSnapshot | null> {
  const time = await lastModified(path);
  const blob = time === null ? null : await readBlob(path);
  return time === null || blob === null ? null : { text: await blob.text(), lastModified: time };
}

/**
 * `write()` of a cloud storage on top of an upload that knows conflicts: a conflict is an error.
 * Only a file with an earlier check can have a conflict. The store does not save the data file
 * with `write()`, so this error is rare.
 */
export function failOnConflict(
  session: CloudSession,
  upload: (path: string, content: string | Blob) => Promise<WriteResult>,
): DataFolder["write"] {
  return async (path, content) => {
    const time = await upload(path, content);
    if (time === "changed") throw session.failure(CHANGED_ELSEWHERE);
    return time;
  };
}
