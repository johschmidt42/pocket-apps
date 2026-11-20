// The login to a cloud storage (OneDrive, Dropbox): OAuth 2.0 with PKCE in the browser. There is
// no secret and no server. Each provider gives its addresses and fields (`CloudProvider`).
// The login always comes back to the start page of the site (`/pocket-apps/`). Then the app
// registration of a provider needs only one address per web address, also for new apps. The start
// page ends the login and goes back to the page of the app where the login started.
import { z } from "zod";
import { DataFileError } from "./errors.ts";
import type { CloudKind } from "./folder.ts";
import { FOLDER_KEY, indexedDbStore, type KeyValueStore } from "./settings-store.ts";

/** What the cloud code needs from the browser. Tests give fakes. */
export type CloudDeps = {
  /** Keeps the tokens and the picked storage. */
  store: KeyValueStore;
  /** Keeps the login while the page goes to the provider and back. */
  session: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  fetch: typeof fetch;
  /** The address of the page. */
  address: () => string;
  /** Opens another page: the login of the provider, or the page of the app after the login. */
  navigate: (url: string) => void;
  /** Changes the address without a new page, for example to remove the login code. */
  replaceAddress: (url: string) => void;
  now: () => number;
};

function browserDeps(): CloudDeps {
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

/** The browser functions, with the fakes of a test instead of some of them. */
export function cloudDeps(overrides: Partial<CloudDeps> = {}): CloudDeps {
  return { ...browserDeps(), ...overrides };
}

/** A cloud storage with OAuth 2.0 and PKCE. */
export type CloudProvider = {
  kind: CloudKind;
  /** The name of the storage in messages: "OneDrive". */
  name: string;
  /** The company of the login in messages: "Microsoft". */
  company: string;
  /** The ID of the app registration. It is public, it is not a secret. */
  clientId: string;
  authorizeUrl: string;
  tokenUrl: string;
  /** More fields of the login request, for example the scope. */
  authorizeFields: Record<string, string>;
  /** Fields of the login request that show the list of accounts. */
  chooseAccountFields: Record<string, string>;
  /** More fields of a refresh of the tokens, for example the scope. */
  refreshFields: Record<string, string>;
};

const LOGIN_KEY = "pocket-apps-cloud-login";
/** A login error on the start page, for the page of the app. */
const LOGIN_ERROR_KEY = "pocket-apps-cloud-login-error";

const tokenAnswerSchema = z.object({
  access_token: z.string(),
  // A refresh at Dropbox gives no new refresh token: the old one stays valid.
  refresh_token: z.string().optional(),
  expires_in: z.number(),
});
const tokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
});
type Tokens = z.infer<typeof tokensSchema>;
const loginSchema = z.object({
  provider: z.string(),
  verifier: z.string(),
  state: z.string(),
  returnTo: z.string(),
});

function tokenKey(provider: CloudProvider): string {
  return `${provider.kind}-tokens`;
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

/** A promise that never ends: the page leaves, so the code after it must not run. */
const stayOnPage = () => new Promise<never>(() => undefined);

const loginError = (message: string) => new DataFileError("cloud-login", message);
const failure = (message: string) => new DataFileError("cloud-failed", message);

/** Sends a request. A failed connection is a German error. */
async function send(deps: CloudDeps, name: string, url: string, init: RequestInit) {
  try {
    return await deps.fetch(url, init);
  } catch {
    throw failure(`${name} ist nicht erreichbar. Prüfe deine Internetverbindung.`);
  }
}

/**
 * Gets tokens and keeps them. `null`: the provider does not accept the code or the refresh token
 * (400 or 401). Other failures, for example 503, are errors: the tokens stay.
 */
async function requestTokens(
  provider: CloudProvider,
  deps: CloudDeps,
  fields: Record<string, string>,
  refreshToken: string | null,
): Promise<Tokens | null> {
  const response = await send(deps, provider.name, provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: provider.clientId, ...fields }),
  });
  if (response.status === 400 || response.status === 401) return null;
  if (!response.ok) {
    throw failure(
      `Die Anmeldung bei ${provider.company} hat mit dem Fehler ${String(response.status)} geantwortet.`,
    );
  }
  const answer = tokenAnswerSchema.safeParse(await response.json().catch(() => null));
  const newRefreshToken = answer.success ? (answer.data.refresh_token ?? refreshToken) : null;
  if (!answer.success || newRefreshToken === null) {
    throw failure(`${provider.name} hat eine unerwartete Antwort geschickt.`);
  }
  const tokens: Tokens = {
    accessToken: answer.data.access_token,
    refreshToken: newRefreshToken,
    expiresAt: deps.now() + answer.data.expires_in * 1000,
  };
  await deps.store.set(tokenKey(provider), tokens);
  return tokens;
}

/** The login and the tokens of one provider. */
export type CloudSession = {
  provider: CloudProvider;
  /** "granted" with a valid login, else "prompt". */
  queryAccess: () => Promise<PermissionState>;
  /**
   * A request with the access token. Without a login, or after 401 (the login is not valid, the
   * tokens go away), it throws a German error.
   */
  request: (url: string, init?: RequestInit) => Promise<Response>;
  /**
   * Goes to the login of the provider. The promise does not end, because the page leaves.
   * `chooseAccount`: the provider shows the list of accounts, also if one account is logged in.
   */
  startLogin: (options: { chooseAccount: boolean }) => Promise<never>;
  /** Forgets the tokens, for example when the person picks another storage. */
  forget: () => Promise<void>;
  /** A German error of the storage, for example "OneDrive hat mit dem Fehler 503 geantwortet." */
  failure: (message: string) => DataFileError;
};

/** The session of one provider. `overrides` is only for tests. */
export function createCloudSession(
  provider: CloudProvider,
  overrides: Partial<CloudDeps> = {},
): CloudSession {
  const deps = cloudDeps(overrides);
  let refreshing: Promise<string | null> | null = null;

  const loginExpired = () =>
    loginError(
      `Deine Anmeldung bei ${provider.name} gilt nicht mehr. Lade die Seite neu und melde dich wieder an.`,
    );

  async function savedTokens(): Promise<Tokens | null> {
    const parsed = tokensSchema.safeParse(await deps.store.get(tokenKey(provider)));
    return parsed.success ? parsed.data : null;
  }

  async function refresh(tokens: Tokens): Promise<string | null> {
    const fields = {
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      ...provider.refreshFields,
    };
    const fresh = await requestTokens(provider, deps, fields, tokens.refreshToken);
    if (!fresh) await deps.store.set(tokenKey(provider), null);
    return fresh?.accessToken ?? null;
  }

  /** A refresh of the tokens. Two requests at the same time use one refresh. */
  function refreshOnce(tokens: Tokens): Promise<string | null> {
    refreshing ??= refresh(tokens).finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  /** A valid access token, or `null` if the person must log in again. */
  async function accessToken(): Promise<string | null> {
    const tokens = await savedTokens();
    if (!tokens) return null;
    return tokens.expiresAt - 60_000 > deps.now() ? tokens.accessToken : refreshOnce(tokens);
  }

  function withToken(url: string, init: RequestInit, token: string): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return send(deps, provider.name, url, { ...init, headers });
  }

  return {
    provider,
    queryAccess: async () => ((await accessToken()) === null ? "prompt" : "granted"),
    async request(url, init = {}) {
      const token = await accessToken();
      if (token === null) throw loginExpired();
      let response = await withToken(url, init, token);
      // The provider rejects the token, for example because the clock of the device is wrong.
      // One refresh can fix it. Only if that fails, the person must log in again.
      const tokens = response.status === 401 ? await savedTokens() : null;
      const fresh = tokens ? await refreshOnce(tokens) : null;
      if (fresh !== null) response = await withToken(url, init, fresh);
      if (response.status === 401) {
        await deps.store.set(tokenKey(provider), null);
        throw loginExpired();
      }
      return response;
    },
    async startLogin({ chooseAccount }) {
      const verifier = randomText();
      const state = randomText();
      const address = deps.address();
      const login = { provider: provider.kind, verifier, state, returnTo: address };
      deps.session.setItem(LOGIN_KEY, JSON.stringify(login));
      const url = new URL(provider.authorizeUrl);
      url.search = new URLSearchParams({
        client_id: provider.clientId,
        response_type: "code",
        redirect_uri: startPageOf(address),
        state,
        code_challenge: await challengeOf(verifier),
        code_challenge_method: "S256",
        ...provider.authorizeFields,
        ...(chooseAccount && provider.chooseAccountFields),
      }).toString();
      deps.navigate(url.href);
      return stayOnPage();
    },
    forget: () => deps.store.set(tokenKey(provider), null),
    failure,
  };
}

/**
 * Ends a login when a provider sent the person back to this page. Then this provider is the
 * picked storage. If the login started on another page, the promise does not end: the page goes
 * back there, also after a failed login. Then that page throws the error. Does nothing on a
 * normal visit. `overrides` is only for tests.
 */
export async function finishCloudLogin(
  providers: readonly CloudProvider[],
  overrides: Partial<CloudDeps> = {},
): Promise<void> {
  const deps = cloudDeps(overrides);
  // A login that failed on the start page: this page shows the error.
  const earlierError = deps.session.getItem(LOGIN_ERROR_KEY);
  deps.session.removeItem(LOGIN_ERROR_KEY);
  if (earlierError !== null) throw loginError(earlierError);

  const address = deps.address();
  const params = new URL(address).searchParams;
  if (!params.has("code") && !params.has("error")) return;
  const text = deps.session.getItem(LOGIN_KEY);
  deps.session.removeItem(LOGIN_KEY);
  const parsed = loginSchema.safeParse(parseJson(text));
  const login = parsed.success ? parsed.data : null;
  // The code works only once. It must not stay in the address or in the browser history.
  deps.replaceAddress(withoutQuery(address));
  const provider = providers.find((item) => item.kind === login?.provider) ?? null;
  const elsewhere = login !== null && withoutQuery(login.returnTo) !== withoutQuery(address);
  try {
    await redeemCode(
      params,
      address,
      provider,
      login?.state === params.get("state") ? login : null,
    );
  } catch (error) {
    if (!elsewhere || !(error instanceof DataFileError)) throw error;
    deps.session.setItem(LOGIN_ERROR_KEY, error.message);
  }
  if (elsewhere) {
    deps.navigate(login.returnTo);
    await stayOnPage();
  }

  /** Gets the tokens for the code in the address. Throws a German error if it fails. */
  async function redeemCode(
    answer: URLSearchParams,
    page: string,
    from: CloudProvider | null,
    fitting: { verifier: string } | null,
  ): Promise<void> {
    const name = from?.name ?? "dem Speicherdienst";
    const code = answer.get("code");
    if (code === null) {
      const error = String(answer.get("error"));
      throw loginError(
        error === "access_denied"
          ? `Du hast die Anmeldung bei ${name} abgebrochen.`
          : `Die Anmeldung bei ${name} hat nicht geklappt: ${answer.get("error_description") ?? error}`,
      );
    }
    if (from === null || fitting === null) {
      throw loginError("Die Antwort passt nicht zu deiner Anmeldung. Versuche es noch einmal.");
    }
    const fields = {
      grant_type: "authorization_code",
      code,
      redirect_uri: startPageOf(page),
      code_verifier: fitting.verifier,
    };
    if (!(await requestTokens(from, deps, fields, null))) {
      throw loginError(`Die Anmeldung bei ${name} hat nicht geklappt. Versuche es noch einmal.`);
    }
    await deps.store.set(FOLDER_KEY, from.kind);
    // Only the picked storage keeps a login.
    for (const other of providers) {
      if (other !== from) await deps.store.set(tokenKey(other), null);
    }
  }
}

function parseJson(text: string | null): unknown {
  try {
    return JSON.parse(text ?? "null");
  } catch {
    return null;
  }
}
