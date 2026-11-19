// The data folder in OneDrive: the app folder `/Apps/Pocket Apps` of the app registration
// "Pocket Apps" (Microsoft Entra), over Microsoft Graph.
// Login: OAuth 2.0 with PKCE in the browser. There is no secret and no server. Microsoft gives a
// browser app (platform "SPA") a refresh token for 24 hours.
// The login always comes back to the start page of the site (`/pocket-apps/`). Then the app
// registration needs only one address per web address, also for new apps. The start page ends
// the login and goes back to the page of the app where the login started.
import { z } from "zod";
import { DataFileError } from "./errors.ts";
import type { DataFolder, FileSnapshot } from "./folder.ts";
import { FOLDER_KEY, indexedDbStore, type KeyValueStore } from "./settings-store.ts";

/** The app registration "Pocket Apps". A client ID is public, it is not a secret. */
const CLIENT_ID = "33746798-d776-4907-85da-27d3636bf316";
const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const APP_ROOT = "https://graph.microsoft.com/v1.0/me/drive/special/approot";
const SCOPE = "Files.ReadWrite.AppFolder offline_access";
/** The value of `FOLDER_KEY` when the person picked OneDrive. */
export const ONEDRIVE_CHOICE = "onedrive";
const TOKEN_KEY = "onedrive-tokens";
const LOGIN_KEY = "pocket-apps-onedrive-login";
/** A login error on the start page, for the page of the app. */
const LOGIN_ERROR_KEY = "pocket-apps-onedrive-login-error";

const tokenAnswerSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});
const tokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
});
type Tokens = z.infer<typeof tokensSchema>;
const loginSchema = z.object({ verifier: z.string(), state: z.string(), returnTo: z.string() });
const itemSchema = z.object({
  lastModifiedDateTime: z.iso.datetime({ offset: true }),
  eTag: z.string(),
});

/** What the OneDrive code needs from the browser. Tests give fakes. */
export type OneDriveDeps = {
  /** Keeps the tokens and the picked storage. */
  store: KeyValueStore;
  /** Keeps the login while the page goes to Microsoft and back. */
  session: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  fetch: typeof fetch;
  /** The address of the page. */
  address: () => string;
  /** Opens another page: the Microsoft login, or the page of the app after the login. */
  navigate: (url: string) => void;
  /** Changes the address without a new page, for example to remove the login code. */
  replaceAddress: (url: string) => void;
  now: () => number;
};

function browserDeps(): OneDriveDeps {
  return {
    store: indexedDbStore,
    session: window.sessionStorage,
    fetch: (input, init) => window.fetch(input, init),
    address: () => window.location.href,
    navigate: (url) => {
      window.location.assign(url);
    },
    replaceAddress: (url) => {
      window.history.replaceState(window.history.state, "", url);
    },
    now: () => Date.now(),
  };
}

function base64Url(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomText(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function challengeOf(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(hash));
}

/** The start page of the site: the folder of the page, without file name, query and hash. */
function startPageOf(address: string): string {
  return new URL(".", address).href;
}

/** The address without the query (the login code). The hash (a sub-page) stays. */
function withoutQuery(address: string): string {
  const url = new URL(address);
  url.search = "";
  return url.href;
}

function itemUrl(path: string): string {
  return `${APP_ROOT}:/${path.split("/").map(encodeURIComponent).join("/")}:`;
}

const loginExpired = () =>
  new DataFileError(
    "onedrive-login",
    "Deine Anmeldung bei OneDrive gilt nicht mehr. Lade die Seite neu und melde dich wieder an.",
  );

/** A promise that never ends: the page leaves, so the code after it must not run. */
const stayOnPage = () => new Promise<never>(() => undefined);

const unexpected = () =>
  new DataFileError("onedrive-failed", "OneDrive hat eine unerwartete Antwort geschickt.");

const offline = () =>
  new DataFileError(
    "onedrive-failed",
    "OneDrive ist nicht erreichbar. Prüfe deine Internetverbindung.",
  );

export type OneDrive = {
  folder: DataFolder;
  /**
   * Goes to the Microsoft login. The promise does not end, because the page leaves.
   * `chooseAccount`: Microsoft shows the list of accounts, also if one account is logged in.
   */
  startLogin: (options: { chooseAccount: boolean }) => Promise<never>;
  /**
   * Ends a login when Microsoft sent the person back to this page. Then OneDrive is the picked
   * storage. If the login started on another page, the promise does not end: the page goes back
   * there, also after a failed login. Then that page throws the error. Does nothing on a normal
   * visit.
   */
  finishLogin: () => Promise<void>;
  /** Forgets the tokens, for example when the person picks a folder on this computer. */
  forget: () => Promise<void>;
};

/** The OneDrive storage. `deps` is only for tests. */
export function createOneDrive(overrides: Partial<OneDriveDeps> = {}): OneDrive {
  const deps = { ...browserDeps(), ...overrides };
  let refreshing: Promise<string | null> | null = null;
  // The eTag of the last check of each file. The next write sends it as `If-Match`: OneDrive
  // writes only if nobody changed the file after the check of the store.
  const checkedTags = new Map<string, string>();

  /** Sends a request. A failed connection is a German error. */
  async function send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await deps.fetch(url, init);
    } catch {
      throw offline();
    }
  }

  /**
   * Gets tokens and keeps them. `null`: Microsoft does not accept the code or the refresh token
   * (400 or 401). Other failures, for example 503, are errors: the tokens stay.
   */
  async function tokenRequest(fields: Record<string, string>): Promise<Tokens | null> {
    const response = await send(`${AUTHORITY}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, ...fields }),
    });
    if (response.status === 400 || response.status === 401) return null;
    if (!response.ok) {
      throw new DataFileError(
        "onedrive-failed",
        `Die Anmeldung bei Microsoft hat mit dem Fehler ${String(response.status)} geantwortet.`,
      );
    }
    const answer = tokenAnswerSchema.safeParse(await response.json());
    if (!answer.success) throw unexpected();
    const tokens: Tokens = {
      accessToken: answer.data.access_token,
      refreshToken: answer.data.refresh_token,
      expiresAt: deps.now() + answer.data.expires_in * 1000,
    };
    await deps.store.set(TOKEN_KEY, tokens);
    return tokens;
  }

  async function savedTokens(): Promise<Tokens | null> {
    const parsed = tokensSchema.safeParse(await deps.store.get(TOKEN_KEY));
    return parsed.success ? parsed.data : null;
  }

  async function refresh(tokens: Tokens): Promise<string | null> {
    const fresh = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      scope: SCOPE,
    });
    if (!fresh) await deps.store.set(TOKEN_KEY, null);
    return fresh?.accessToken ?? null;
  }

  /** A valid access token, or `null` if the person must log in again. */
  async function accessToken(): Promise<string | null> {
    const tokens = await savedTokens();
    if (!tokens) return null;
    if (tokens.expiresAt - 60_000 > deps.now()) return tokens.accessToken;
    // Two requests at the same time use one refresh.
    refreshing ??= refresh(tokens).finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  /** A request to Microsoft Graph. 404 is a normal answer. Other failures are German errors. */
  async function graph(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await accessToken();
    if (token === null) throw loginExpired();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await send(url, { ...init, headers });
    if (response.status === 401) {
      await deps.store.set(TOKEN_KEY, null);
      throw loginExpired();
    }
    if (response.status === 412) {
      throw new DataFileError(
        "onedrive-failed",
        "Die Datei hat sich gerade woanders geändert. Die App prüft sie gleich noch einmal.",
      );
    }
    if (!response.ok && response.status !== 404) {
      throw new DataFileError(
        "onedrive-failed",
        `OneDrive hat mit dem Fehler ${String(response.status)} geantwortet.`,
      );
    }
    return response;
  }

  /** The time of the last change from an answer of Graph. Keeps the eTag for the next write. */
  async function timeOf(path: string, response: Response): Promise<number> {
    const item = itemSchema.safeParse(await response.json().catch(() => null));
    if (!item.success) throw unexpected();
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

  const folder: DataFolder = {
    name: "OneDrive",
    kind: "onedrive",
    queryAccess: async () => ((await accessToken()) === null ? "prompt" : "granted"),
    requestAccess: () => startLogin({ chooseAccount: false }),
    lastModified,
    readBlob,
    async read(path): Promise<FileSnapshot | null> {
      // First the time, then the text. If the file changes in between, the time is older than
      // the text. Then the next save shows a conflict and loses nothing. The other order could
      // overwrite the change of another device.
      const time = await lastModified(path);
      const blob = time === null ? null : await readBlob(path);
      return time === null || blob === null
        ? null
        : { text: await blob.text(), lastModified: time };
    },
    async write(path, content) {
      const type = typeof content === "string" ? "text/plain; charset=utf-8" : content.type;
      const headers = new Headers({ "Content-Type": type || "application/octet-stream" });
      const tag = checkedTags.get(path);
      if (tag !== undefined) headers.set("If-Match", tag);
      const response = await graph(`${itemUrl(path)}/content`, {
        method: "PUT",
        headers,
        body: content,
      });
      return timeOf(path, response);
    },
    async remove(path) {
      checkedTags.delete(path);
      await graph(itemUrl(path), { method: "DELETE" });
    },
  };

  async function startLogin({ chooseAccount }: { chooseAccount: boolean }): Promise<never> {
    const verifier = randomText();
    const state = randomText();
    const address = deps.address();
    deps.session.setItem(LOGIN_KEY, JSON.stringify({ verifier, state, returnTo: address }));
    const url = new URL(`${AUTHORITY}/authorize`);
    url.search = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: startPageOf(address),
      scope: SCOPE,
      state,
      code_challenge: await challengeOf(verifier),
      code_challenge_method: "S256",
      ...(chooseAccount && { prompt: "select_account" }),
    }).toString();
    deps.navigate(url.href);
    return stayOnPage();
  }

  function savedLogin() {
    const text = deps.session.getItem(LOGIN_KEY);
    deps.session.removeItem(LOGIN_KEY);
    try {
      const parsed = loginSchema.safeParse(JSON.parse(text ?? "null"));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /** Gets the tokens for the code in the address. Throws a German error if it fails. */
  async function redeemCode(params: URLSearchParams, address: string, verifier: string | null) {
    const code = params.get("code");
    if (code === null) {
      const error = String(params.get("error"));
      throw new DataFileError(
        "onedrive-login",
        error === "access_denied"
          ? "Du hast die Anmeldung bei OneDrive abgebrochen."
          : `Die Anmeldung bei OneDrive hat nicht geklappt: ${params.get("error_description") ?? error}`,
      );
    }
    if (verifier === null) {
      throw new DataFileError(
        "onedrive-login",
        "Die Antwort von Microsoft passt nicht zu deiner Anmeldung. Versuche es noch einmal.",
      );
    }
    const tokens = await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: startPageOf(address),
      code_verifier: verifier,
    });
    if (!tokens) {
      throw new DataFileError(
        "onedrive-login",
        "Die Anmeldung bei OneDrive hat nicht geklappt. Versuche es noch einmal.",
      );
    }
    await deps.store.set(FOLDER_KEY, ONEDRIVE_CHOICE);
  }

  async function finishLogin(): Promise<void> {
    // A login that failed on the start page: this page shows the error.
    const earlierError = deps.session.getItem(LOGIN_ERROR_KEY);
    deps.session.removeItem(LOGIN_ERROR_KEY);
    if (earlierError !== null) throw new DataFileError("onedrive-login", earlierError);

    const address = deps.address();
    const params = new URL(address).searchParams;
    if (!params.has("code") && !params.has("error")) return;
    const login = savedLogin();
    // The code works only once. It must not stay in the address or in the browser history.
    deps.replaceAddress(withoutQuery(address));
    const fits = login !== null && login.state === params.get("state");
    const elsewhere = login !== null && withoutQuery(login.returnTo) !== withoutQuery(address);
    try {
      await redeemCode(params, address, fits ? login.verifier : null);
    } catch (error) {
      if (!elsewhere || !(error instanceof DataFileError)) throw error;
      deps.session.setItem(LOGIN_ERROR_KEY, error.message);
    }
    if (elsewhere) {
      deps.navigate(login.returnTo);
      await stayOnPage();
    }
  }

  return {
    folder,
    startLogin,
    finishLogin,
    forget: () => deps.store.set(TOKEN_KEY, null),
  };
}
