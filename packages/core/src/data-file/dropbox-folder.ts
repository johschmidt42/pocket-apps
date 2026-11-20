// The data folder in Dropbox: the app folder `/Apps/Pocket Apps` of the Dropbox app "Pocket Apps",
// over the Dropbox API. The login is in `cloud-login.ts`. Dropbox gives a refresh token without an
// end, so the person logs in only once per browser.
import { z } from "zod";
import { failOnConflict } from "./cloud-folder.ts";
import type { CloudProvider, CloudSession } from "./cloud-login.ts";
import { checkThenWrite, type DataFolder, type FileSnapshot, type WriteResult } from "./folder.ts";

const API = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";

/** The Dropbox app "Pocket Apps" with the access type "App folder". */
export const DROPBOX: CloudProvider = {
  kind: "dropbox",
  name: "Dropbox",
  company: "Dropbox",
  clientId: "pv0wm263lwajq14",
  authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
  tokenUrl: "https://api.dropboxapi.com/oauth2/token",
  // "offline" gives a refresh token. Without it, the login would end after 4 hours.
  authorizeFields: { token_access_type: "offline" },
  // Dropbox has no list of accounts. To use another account, the person logs out on dropbox.com.
  chooseAccountFields: {},
  refreshFields: {},
};

const metadataSchema = z.object({
  server_modified: z.iso.datetime({ offset: true }),
  rev: z.string(),
});
/** The body of an error answer (409): for example "path/not_found/..". */
const errorSchema = z.object({ error_summary: z.string() });

/** A path in the app folder: "/trainingsbuch/trainingsbuch.json". */
function dropboxPath(path: string): string {
  return `/${path}`;
}

/** The JSON in a text, or `null` if the text is missing or not JSON. */
function parseJson(text: string | null): unknown {
  try {
    return JSON.parse(text ?? "");
  } catch {
    return null;
  }
}

/** JSON for the header `Dropbox-API-Arg`. A header takes only ASCII, so other characters are escaped. */
function apiArg(value: unknown): string {
  return JSON.stringify(value).replace(
    /[\u007f-\uffff]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** The app folder in Dropbox, with the login of `session`. */
export function createDropboxFolder(session: CloudSession): DataFolder {
  // The state of each file at the last check of the store: its revision and the time that the
  // app gave for it, or `null` if it did not exist. The next write uses it: Dropbox writes only if
  // nobody changed the file after the check. A file without a check (for example an image) is
  // overwritten.
  const checked = new Map<string, { rev: string; time: number } | null>();

  /** The summary of an error answer (409), or `null`. */
  async function errorOf(response: Response): Promise<string | null> {
    if (response.status !== 409) return null;
    const body = errorSchema.safeParse(await response.json().catch(() => null));
    return body.success ? body.data.error_summary : "";
  }

  /**
   * A request to the Dropbox API. `allowedError` is the start of an error summary (409) that is a
   * normal answer, for example "path/not_found". Other failures are German errors.
   */
  async function call(url: string, init: RequestInit, allowedError: string) {
    const response = await session.request(url, { method: "POST", ...init });
    if (response.ok) return { response, error: null };
    const error = await errorOf(response);
    if (error?.startsWith(allowedError)) return { response, error };
    throw session.failure(`Dropbox hat mit dem Fehler ${String(response.status)} geantwortet.`);
  }

  /**
   * The time of the last change from metadata. Keeps the revision for the next write.
   * Dropbox gives the time only in whole seconds. A new revision in the same second as the known
   * one gets a later time, so that the conflict check of the store sees the change.
   */
  function timeOf(path: string, body: unknown): number {
    const metadata = metadataSchema.safeParse(body);
    if (!metadata.success) throw session.failure("Dropbox hat eine unerwartete Antwort geschickt.");
    const { rev } = metadata.data;
    const known = checked.get(path);
    const time = Date.parse(metadata.data.server_modified);
    const shown =
      known?.rev === rev ? known.time : known && time <= known.time ? known.time + 1 : time;
    checked.set(path, { rev, time: shown });
    return shown;
  }

  async function lastModified(path: string): Promise<number | null> {
    const { response, error } = await call(
      `${API}/files/get_metadata`,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: dropboxPath(path) }),
      },
      "path/not_found",
    );
    if (error !== null) {
      checked.set(path, null);
      return null;
    }
    return timeOf(path, parseJson(await response.text()));
  }

  function download(path: string) {
    return call(
      `${CONTENT}/files/download`,
      { headers: { "Dropbox-API-Arg": apiArg({ path: dropboxPath(path) }) } },
      "path/not_found",
    );
  }

  async function readBlob(path: string): Promise<Blob | null> {
    const { response, error } = await download(path);
    return error === null ? response.blob() : null;
  }

  /**
   * Reads a file in one request. The download gives the metadata in the header
   * `Dropbox-API-Result`, so the text and the revision come from the same answer.
   */
  async function read(path: string): Promise<FileSnapshot | null> {
    const { response, error } = await download(path);
    if (error !== null) {
      checked.set(path, null);
      return null;
    }
    const time = timeOf(path, parseJson(response.headers.get("Dropbox-API-Result")));
    return { text: await response.text(), lastModified: time };
  }

  /**
   * Writes a file with the state of the last check: `update` with the revision, `add` for a file
   * that did not exist, or `overwrite` for a file without a check (for example an image).
   * Dropbox documents that `update` and `add` give a conflict if the file changed.
   */
  async function upload(path: string, content: string | Blob): Promise<WriteResult> {
    const state = checked.get(path);
    const mode =
      state === undefined
        ? "overwrite"
        : state === null
          ? "add"
          : { ".tag": "update", update: state.rev };
    const arg = {
      path: dropboxPath(path),
      mode,
      autorename: false,
      mute: true,
      strict_conflict: true,
    };
    const { response, error } = await call(
      `${CONTENT}/files/upload`,
      {
        headers: { "Content-Type": "application/octet-stream", "Dropbox-API-Arg": apiArg(arg) },
        body: content,
      },
      "path/conflict",
    );
    return error === null ? timeOf(path, parseJson(await response.text())) : "changed";
  }

  /** The time of the last check, `null` for a file that did not exist, `undefined` without a check. */
  function checkedTime(path: string): number | null | undefined {
    const state = checked.get(path);
    return state === undefined ? undefined : (state?.time ?? null);
  }

  const checkFirst = checkThenWrite(lastModified, upload);

  return {
    name: "Dropbox",
    kind: "dropbox",
    queryAccess: session.queryAccess,
    requestAccess: () => session.startLogin({ chooseAccount: false }),
    lastModified,
    readBlob,
    read,
    write: failOnConflict(session, upload),
    // The upload checks the revision itself. Only if the store expects another time than the last
    // check (for example after a look at the raw file), the folder checks the time first.
    writeIfUnchanged: (path, content, expected) =>
      checkedTime(path) === expected ? upload(path, content) : checkFirst(path, content, expected),
    async remove(path) {
      checked.delete(path);
      await call(
        `${API}/files/delete_v2`,
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: dropboxPath(path) }),
        },
        "path_lookup/not_found",
      );
    },
  };
}
