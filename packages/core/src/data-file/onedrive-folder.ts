// The data folder in OneDrive: the app folder `/Apps/Pocket Apps` of the app registration
// "Pocket Apps" (Microsoft Entra), over Microsoft Graph. The login is in `cloud-login.ts`.
// Microsoft gives a browser app (platform "SPA") a refresh token for 24 hours.
import { z } from "zod";
import { failOnConflict, readTimeThenText } from "./cloud-folder.ts";
import type { CloudProvider, CloudSession } from "./cloud-login.ts";
import { checkThenWrite, type DataFolder } from "./folder.ts";

const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const APP_ROOT = "https://graph.microsoft.com/v1.0/me/drive/special/approot";
const SCOPE = "Files.ReadWrite.AppFolder offline_access";

/** The app registration "Pocket Apps" in the Entra tenant of the project owner. */
export const ONEDRIVE: CloudProvider = {
  kind: "onedrive",
  name: "OneDrive",
  company: "Microsoft",
  clientId: "33746798-d776-4907-85da-27d3636bf316",
  authorizeUrl: `${AUTHORITY}/authorize`,
  tokenUrl: `${AUTHORITY}/token`,
  authorizeFields: { scope: SCOPE },
  chooseAccountFields: { prompt: "select_account" },
  refreshFields: { scope: SCOPE },
};

const itemSchema = z.object({
  lastModifiedDateTime: z.iso.datetime({ offset: true }),
  eTag: z.string(),
});

function itemUrl(path: string): string {
  return `${APP_ROOT}:/${path.split("/").map(encodeURIComponent).join("/")}:`;
}

/** The app folder in OneDrive, with the login of `session`. */
export function createOneDriveFolder(session: CloudSession): DataFolder {
  // The eTag of the last check of each file. The next write sends it as `If-Match`: OneDrive
  // writes only if nobody changed the file after the check of the store.
  const checkedTags = new Map<string, string>();

  /**
   * A request to Microsoft Graph. 404 (no file) and 412 (`If-Match` does not match) are normal
   * answers. Other failures are German errors.
   */
  async function graph(url: string, init: RequestInit = {}): Promise<Response> {
    const response = await session.request(url, init);
    if (!response.ok && response.status !== 404 && response.status !== 412) {
      throw session.failure(`OneDrive hat mit dem Fehler ${String(response.status)} geantwortet.`);
    }
    return response;
  }

  /** The time of the last change from an answer of Graph. Keeps the eTag for the next write. */
  async function timeOf(path: string, response: Response): Promise<number> {
    const item = itemSchema.safeParse(await response.json().catch(() => null));
    if (!item.success) throw session.failure("OneDrive hat eine unerwartete Antwort geschickt.");
    checkedTags.set(path, item.data.eTag);
    return Date.parse(item.data.lastModifiedDateTime);
  }

  async function lastModified(path: string): Promise<number | null> {
    const response = await graph(`${itemUrl(path)}?$select=lastModifiedDateTime,eTag`);
    if (response.status === 404) {
      checkedTags.delete(path);
      return null;
    }
    return timeOf(path, response);
  }

  async function readBlob(path: string): Promise<Blob | null> {
    const response = await graph(`${itemUrl(path)}/content`);
    return response.status === 404 ? null : response.blob();
  }

  /** Writes a file. Sends the eTag of the last check as `If-Match`. */
  async function upload(path: string, content: string | Blob): Promise<number | "changed"> {
    const type = typeof content === "string" ? "text/plain; charset=utf-8" : content.type;
    const headers = new Headers({ "Content-Type": type || "application/octet-stream" });
    const tag = checkedTags.get(path);
    if (tag !== undefined) headers.set("If-Match", tag);
    const response = await graph(`${itemUrl(path)}/content`, {
      method: "PUT",
      headers,
      body: content,
    });
    return response.status === 412 ? "changed" : timeOf(path, response);
  }

  return {
    name: "OneDrive",
    kind: "onedrive",
    queryAccess: session.queryAccess,
    requestAccess: () => session.startLogin({ chooseAccount: false }),
    lastModified,
    readBlob,
    read: (path) => readTimeThenText(path, lastModified, readBlob),
    write: failOnConflict(session, upload),
    // Microsoft documents `If-Match` only for upload sessions, not for this simple upload. So the
    // folder checks the time first: one more request, but no lost change if Graph ignores it.
    writeIfUnchanged: checkThenWrite(lastModified, upload),
    async remove(path) {
      checkedTags.delete(path);
      await graph(itemUrl(path), { method: "DELETE" });
    },
  };
}
