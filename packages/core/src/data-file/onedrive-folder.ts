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
const CLIENT_ID = "68c00226-31d2-41f6-ab60-bb12fc6208f8";
const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const APP_ROOT = "https://graph.microsoft.com/v1.0/me/drive/special/approot";
const SCOPE = "Files.ReadWrite.AppFolder offline_access";
/** The value of `FOLDER_KEY` when the person picked OneDrive. */
export const ONEDRIVE = "onedrive";
const TOKEN_KEY = "onedrive-tokens";
const LOGIN_KEY = "pocket-apps-onedrive-login";

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
const itemSchema = z.object({ lastModifiedDateTime: z.string() });

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
  go: (url: string) => void;
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
    go: (url) => {
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
    "Deine Anmeldung bei OneDrive ist abgelaufen. Lade die Seite neu und melde dich wieder an.",
  );

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
  startLogin: (chooseAccount: boolean) => Promise<never>;
  /**
   * Ends a login when Microsoft sent the person back to this page. Then OneDrive is the picked
   * storage. If the login started on another page, the promise does not end: the page goes back
   * there. Does nothing on a normal visit.
   */
  finishLogin: () => Promise<void>;
  /** Forgets the tokens, for example when the person picks a folder on this computer. */
  forget: () => Promise<void>;
};

/** The OneDrive storage. `deps` is only for tests. */
export function createOneDrive(overrides: Partial<OneDriveDeps> = {}): OneDrive {
  const deps = { ...browserDeps(), ...overrides };
  let refreshing: Promise<string | null> | null = null;

  /** Sends a request. A failed connection is a German error. */
  async function send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await deps.fetch(url, init);
    } catch {
      throw offline();
    }
  }

  async function tokenRequest(fields: Record<string, string>): Promise<Tokens | null> {
    const response = await send(`${AUTHORITY}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, ...fields }),
    });
    if (!response.ok) return null;
    const answer = tokenAnswerSchema.safeParse(await response.json());
    if (!answer.success) return null;
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
    if (!response.ok && response.status !== 404) {
      throw new DataFileError(
        "onedrive-failed",
        `OneDrive hat mit dem Fehler ${String(response.status)} geantwortet.`,
      );
    }
    return response;
  }

  async function lastModified(path: string): Promise<number | null> {
    const response = await graph(`${itemUrl(path)}?$select=lastModifiedDateTime`);
    if (response.status === 404) return null;
    return Date.parse(itemSchema.parse(await response.json()).lastModifiedDateTime);
  }

  async function readBlob(path: string): Promise<Blob | null> {
    const response = await graph(`${itemUrl(path)}/content`);
    return response.status === 404 ? null : response.blob();
  }

  const folder: DataFolder = {
    name: "OneDrive",
    kind: "onedrive",
    queryAccess: async () => ((await accessToken()) === null ? "prompt" : "granted"),
    requestAccess: () => startLogin(false),
    lastModified,
    readBlob,
    async read(path): Promise<FileSnapshot | null> {
      // Both at the same time: this saves one round trip. If the file changes in between, the
      // time is older than the text. Then the next save shows a conflict and loses nothing.
      const [time, blob] = await Promise.all([lastModified(path), readBlob(path)]);
      return time === null || blob === null
        ? null
        : { text: await blob.text(), lastModified: time };
    },
    async write(path, content) {
      const type = typeof content === "string" ? "text/plain; charset=utf-8" : content.type;
      const response = await graph(`${itemUrl(path)}/content`, {
        method: "PUT",
        headers: { "Content-Type": type || "application/octet-stream" },
        body: content,
      });
      return Date.parse(itemSchema.parse(await response.json()).lastModifiedDateTime);
    },
    async remove(path) {
      await graph(itemUrl(path), { method: "DELETE" });
    },
  };

  async function startLogin(chooseAccount: boolean): Promise<never> {
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
    deps.go(url.href);
    return new Promise<never>(() => undefined);
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

  async function finishLogin(): Promise<void> {
    const address = deps.address();
    const params = new URL(address).searchParams;
    if (!params.has("code") && !params.has("error")) return;
    const login = savedLogin();
    // The code works only once. It must not stay in the address or in the browser history.
    deps.replaceAddress(withoutQuery(address));
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
    if (login?.state !== params.get("state")) {
      throw new DataFileError(
        "onedrive-login",
        "Die Antwort von Microsoft passt nicht zu deiner Anmeldung. Versuche es noch einmal.",
      );
    }
    const tokens = await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: startPageOf(address),
      code_verifier: login.verifier,
    });
    if (!tokens) {
      throw new DataFileError(
        "onedrive-login",
        "Die Anmeldung bei OneDrive hat nicht geklappt. Versuche es noch einmal.",
      );
    }
    await deps.store.set(FOLDER_KEY, ONEDRIVE);
    if (withoutQuery(login.returnTo) !== withoutQuery(address)) {
      deps.go(login.returnTo);
      await new Promise<never>(() => undefined);
    }
  }

  return {
    folder,
    startLogin,
    finishLogin,
    forget: () => deps.store.set(TOKEN_KEY, null),
  };
}
