// The data folder in Dropbox: the app folder `/Apps/Pocket Apps` of the Dropbox app "Pocket Apps",
// over the Dropbox API. The login is in `cloud-login.ts`. Dropbox gives a refresh token without an
// end, so the person logs in only once per browser.
import { z } from "zod";
import type { CloudProvider, CloudSession } from "./cloud-login.ts";
import type { DataFolder, FileSnapshot } from "./folder.ts";

const API = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";

/** The Dropbox app "Pocket Apps" with the access type "App folder". */
export const DROPBOX: CloudProvider = {
  kind: "dropbox",
  name: "Dropbox",
  company: "Dropbox",
  clientId: "DROPBOX_APP_KEY",
  authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
  tokenUrl: "https://api.dropboxapi.com/oauth2/token",
  // "offline" gives a refresh token. Without it, the login would end after 4 hours.
  authorizeFields: { token_access_type: "offline" },
  chooseAccountFields: { force_reauthentication: "true" },
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

/** JSON for the header `Dropbox-API-Arg`. A header takes only ASCII, so other characters are escaped. */
function apiArg(value: unknown): string {
  return JSON.stringify(value).replace(
    /[\u007f-￿]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** The app folder in Dropbox, with the login of `session`. */
export function createDropboxFolder(session: CloudSession): DataFolder {
  // The state of each file at the last check of the store: its revision, or `null` if it did
  // not exist. The next write uses it: Dropbox writes only if nobody changed the file after the
  // check. A file without a check (for example an image) is overwritten.
  const checked = new Map<string, string | null>();

  /** The summary of an error answer (409), or `null`. */
  async function errorOf(response: Response): Promise<string | null> {
    if (response.status !== 409) return null;
    const body = errorSchema.safeParse(await response.json().catch(() => null));
    return body.success ? body.data.error_summary : "";
  }

  /** A request to the Dropbox API. Throws a German error for all failures except `allowed`. */
  async function call(url: string, init: RequestInit, allowed: string | null) {
    const response = await session.request(url, { method: "POST", ...init });
    if (response.ok) return { response, error: null };
    const error = await errorOf(response);
    if (error !== null && allowed !== null && error.startsWith(allowed)) return { response, error };
    if (error?.startsWith("path/conflict")) {
      throw session.failure(
        "Die Datei hat sich gerade woanders geändert. Die App prüft sie gleich noch einmal.",
      );
    }
    throw session.failure(`Dropbox hat mit dem Fehler ${String(response.status)} geantwortet.`);
  }

  /** The time of the last change from metadata. Keeps the revision for the next write. */
  async function timeOf(path: string, response: Response): Promise<number> {
    const metadata = metadataSchema.safeParse(await response.json().catch(() => null));
    if (!metadata.success) throw session.failure("Dropbox hat eine unerwartete Antwort geschickt.");
    checked.set(path, metadata.data.rev);
    return Date.parse(metadata.data.server_modified);
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
    return timeOf(path, response);
  }

  async function readBlob(path: string): Promise<Blob | null> {
    const { response, error } = await call(
      `${CONTENT}/files/download`,
      { headers: { "Dropbox-API-Arg": apiArg({ path: dropboxPath(path) }) } },
      "path/not_found",
    );
    return error === null ? response.blob() : null;
  }

  return {
    name: "Dropbox",
    kind: "dropbox",
    queryAccess: session.queryAccess,
    requestAccess: () => session.startLogin({ chooseAccount: false }),
    lastModified,
    readBlob,
    async read(path): Promise<FileSnapshot | null> {
      // First the time, then the text, as in OneDrive: a change in between gives a conflict.
      const time = await lastModified(path);
      const blob = time === null ? null : await readBlob(path);
      return time === null || blob === null
        ? null
        : { text: await blob.text(), lastModified: time };
    },
    async write(path, content) {
      const state = checked.get(path);
      const mode =
        state === undefined
          ? "overwrite"
          : state === null
            ? "add"
            : { ".tag": "update", update: state };
      const arg = {
        path: dropboxPath(path),
        mode,
        autorename: false,
        mute: true,
        strict_conflict: true,
      };
      const { response } = await call(
        `${CONTENT}/files/upload`,
        {
          headers: {
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": apiArg(arg),
          },
          body: content,
        },
        null,
      );
      return timeOf(path, response);
    },
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
