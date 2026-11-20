// The parts that the data folders of all cloud storages share.
import type { FileSnapshot } from "./folder.ts";

/** The message when a file changed between the conflict check and the write. */
export const CHANGED_ELSEWHERE =
  "Die Datei hat sich gerade woanders geändert. Die App prüft sie gleich noch einmal.";

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
