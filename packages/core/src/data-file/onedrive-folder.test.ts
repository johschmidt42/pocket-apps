import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataFileError } from "./errors.ts";
import { createOneDrive, type OneDriveDeps } from "./onedrive-folder.ts";
import type { KeyValueStore } from "./settings-store.ts";

const APP_ROOT = "https://graph.microsoft.com/v1.0/me/drive/special/approot:/";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const START_PAGE = "https://example.org/pocket-apps/";
const APP_PAGE = "https://example.org/pocket-apps/trainingsbuch.html#fran";

function memoryStore(): KeyValueStore & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>();
  return {
    values,
    get: (key) => Promise.resolve(values.get(key)),
    set: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
  };
}

/** OneDrive and the Microsoft login in memory: a fake `fetch`. */
function fakeServer() {
  const server = {
    files: new Map<string, { text: string; time: string }>(),
    requests: [] as { url: string; init: RequestInit | undefined }[],
    tokenStatus: 200,
    tokenBody: undefined as unknown,
    graphStatus: null as number | null,
    offline: false,
    clock: 0,
    fetch: vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      server.requests.push({ url, init });
      if (server.offline) return Promise.reject(new TypeError("Failed to fetch"));
      if (url === TOKEN_URL) {
        const body = server.tokenBody ?? {
          access_token: `access-${String(server.requests.length)}`,
          refresh_token: "refresh",
          expires_in: 3600,
        };
        return Promise.resolve(Response.json(body, { status: server.tokenStatus }));
      }
      if (server.graphStatus !== null) {
        return Promise.resolve(new Response("error", { status: server.graphStatus }));
      }
      const address = decodeURIComponent(url.slice(APP_ROOT.length));
      const [path = "", rest = ""] = address.split(":");
      const file = server.files.get(path);
      const method = init?.method ?? "GET";
      if (method === "PUT") {
        server.clock += 1000;
        const time = new Date(server.clock).toISOString();
        const body = init?.body;
        // Node's Response cannot read a jsdom Blob, so the fake keeps the text.
        const text = typeof body === "string" ? body : await (body as Blob).text();
        server.files.set(path, { text, time });
        return Promise.resolve(Response.json({ lastModifiedDateTime: time }));
      }
      if (!file) return Promise.resolve(new Response("missing", { status: 404 }));
      if (method === "DELETE") {
        server.files.delete(path);
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(
        rest === "/content"
          ? new Response(file.text)
          : Response.json({ lastModifiedDateTime: file.time }),
      );
    }),
  };
  return server;
}

function setup(options: { address?: string; tokens?: unknown } = {}) {
  const server = fakeServer();
  const store = memoryStore();
  if (options.tokens !== undefined) store.values.set("onedrive-tokens", options.tokens);
  const page = { address: options.address ?? APP_PAGE };
  const go = vi.fn();
  const replaceAddress = vi.fn((url: string) => {
    page.address = url;
  });
  const deps: Partial<OneDriveDeps> = {
    store,
    session: window.sessionStorage,
    fetch: server.fetch,
    address: () => page.address,
    go,
    replaceAddress,
    now: () => 1_000_000,
  };
  return { server, store, page, go, replaceAddress, oneDrive: createOneDrive(deps) };
}

const VALID_TOKENS = { accessToken: "access", refreshToken: "refresh", expiresAt: 9_999_999 };
const OLD_TOKENS = { accessToken: "old", refreshToken: "refresh", expiresAt: 1_000_000 };

/** The form fields of a request to the token endpoint. */
function formOf(request: { init: RequestInit | undefined } | undefined): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(request?.init?.body as URLSearchParams));
}

function lastAuthorization(server: ReturnType<typeof fakeServer>): string | null {
  return new Headers(server.requests.at(-1)?.init?.headers).get("Authorization");
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("the OneDrive folder", () => {
  it("writes, reads and removes files in the app folder", async () => {
    const { oneDrive, server } = setup({ tokens: VALID_TOKENS });
    const { folder } = oneDrive;

    expect(folder).toMatchObject({ name: "OneDrive", kind: "onedrive" });
    expect(await folder.read("app-ideen/app-ideen.json")).toBeNull();
    expect(await folder.lastModified("app-ideen/app-ideen.json")).toBeNull();
    expect(await folder.readBlob("app-ideen/foto.jpg")).toBeNull();

    const time = await folder.write("app-ideen/app-ideen.json", "{}");

    expect(await folder.read("app-ideen/app-ideen.json")).toEqual({
      text: "{}",
      lastModified: time,
    });
    expect(await folder.lastModified("app-ideen/app-ideen.json")).toBe(time);
    expect(lastAuthorization(server)).toBe("Bearer access");
    expect(server.requests.at(-1)?.url).toBe(
      `${APP_ROOT}app-ideen/app-ideen.json:?$select=lastModifiedDateTime`,
    );

    await folder.write("app-ideen/foto.jpg", new Blob(["jpeg"], { type: "image/jpeg" }));
    expect(await (await folder.readBlob("app-ideen/foto.jpg"))?.text()).toBe("jpeg");
    const upload = server.requests.find(
      (request) => request.init?.method === "PUT" && request.url.includes("foto"),
    );
    expect(new Headers(upload?.init?.headers).get("Content-Type")).toBe("image/jpeg");

    await folder.remove("app-ideen/foto.jpg");
    expect(await folder.readBlob("app-ideen/foto.jpg")).toBeNull();
    // A missing file is no error.
    await folder.remove("app-ideen/foto.jpg");
  });

  it("encodes the names in the path", async () => {
    const { oneDrive, server } = setup({ tokens: VALID_TOKENS });

    await oneDrive.folder.write("a b/c#d.txt", new Blob(["x"]));

    expect(server.requests.at(-1)?.url).toBe(`${APP_ROOT}a%20b/c%23d.txt:/content`);
    expect(new Headers(server.requests.at(-1)?.init?.headers).get("Content-Type")).toBe(
      "application/octet-stream",
    );
  });

  it("has access with a valid token", async () => {
    const { oneDrive } = setup({ tokens: VALID_TOKENS });

    expect(await oneDrive.folder.queryAccess()).toBe("granted");
  });

  it("refreshes an old token once, also for two requests at the same time", async () => {
    const { oneDrive, server, store } = setup({ tokens: OLD_TOKENS });

    await Promise.all([
      oneDrive.folder.lastModified("a.json"),
      oneDrive.folder.lastModified("b.json"),
    ]);

    expect(server.requests.filter((request) => request.url === TOKEN_URL)).toHaveLength(1);
    expect(formOf(server.requests[0]).grant_type).toBe("refresh_token");
    expect(store.values.get("onedrive-tokens")).toMatchObject({ accessToken: "access-1" });
  });

  it("asks for a new login when the refresh fails", async () => {
    const { oneDrive, server, store } = setup({ tokens: OLD_TOKENS });
    server.tokenStatus = 400;

    expect(await oneDrive.folder.queryAccess()).toBe("prompt");
    expect(store.values.get("onedrive-tokens")).toBeNull();
    await expect(oneDrive.folder.read("a.json")).rejects.toThrow(
      /Anmeldung bei OneDrive ist abgelaufen/,
    );
  });

  it("asks for a new login without tokens", async () => {
    const { oneDrive } = setup({ tokens: { broken: true } });

    expect(await oneDrive.folder.queryAccess()).toBe("prompt");
  });

  it("forgets the tokens when Graph rejects them", async () => {
    const { oneDrive, server, store } = setup({ tokens: VALID_TOKENS });
    server.graphStatus = 401;

    await expect(oneDrive.folder.lastModified("a.json")).rejects.toBeInstanceOf(DataFileError);
    expect(store.values.get("onedrive-tokens")).toBeNull();
  });

  it("gives German errors for other failures", async () => {
    const { oneDrive, server } = setup({ tokens: VALID_TOKENS });
    server.graphStatus = 503;

    await expect(oneDrive.folder.write("a.json", "{}")).rejects.toThrow(
      "OneDrive hat mit dem Fehler 503 geantwortet.",
    );

    server.offline = true;
    await expect(oneDrive.folder.remove("a.json")).rejects.toThrow(
      "OneDrive ist nicht erreichbar. Prüfe deine Internetverbindung.",
    );
  });

  it("forgets the tokens on request", async () => {
    const { oneDrive, store } = setup({ tokens: VALID_TOKENS });

    await oneDrive.forget();

    expect(store.values.get("onedrive-tokens")).toBeNull();
  });
});

describe("the OneDrive login", () => {
  it("goes to Microsoft with PKCE and comes back to the start page", async () => {
    const { oneDrive, go } = setup();

    void oneDrive.startLogin(true);
    await vi.waitFor(() => {
      expect(go).toHaveBeenCalled();
    });

    const url = new URL(String(go.mock.calls[0]?.[0]));
    const login = JSON.parse(window.sessionStorage.getItem("pocket-apps-onedrive-login") ?? "") as {
      state: string;
      returnTo: string;
    };
    expect(url.origin + url.pathname).toBe(
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "68c00226-31d2-41f6-ab60-bb12fc6208f8",
      response_type: "code",
      redirect_uri: START_PAGE,
      scope: "Files.ReadWrite.AppFolder offline_access",
      code_challenge_method: "S256",
      prompt: "select_account",
      state: login.state,
    });
    expect(url.searchParams.get("code_challenge")).toMatch(/^[\w-]{43}$/);
    expect(login.returnTo).toBe(APP_PAGE);
  });

  it("does not ask for the account again when the login expired", async () => {
    const { oneDrive, go } = setup();

    void oneDrive.folder.requestAccess();
    await vi.waitFor(() => {
      expect(go).toHaveBeenCalled();
    });

    expect(new URL(String(go.mock.calls[0]?.[0])).searchParams.has("prompt")).toBe(false);
  });

  it("does nothing on a normal visit", async () => {
    const { oneDrive, server, replaceAddress } = setup();

    await oneDrive.finishLogin();

    expect(server.requests).toHaveLength(0);
    expect(replaceAddress).not.toHaveBeenCalled();
  });

  it("ends the login on the start page and goes back to the app", async () => {
    const { oneDrive, server, store, go, replaceAddress } = setup({
      address: `${START_PAGE}?code=abc&state=s1`,
    });
    window.sessionStorage.setItem(
      "pocket-apps-onedrive-login",
      JSON.stringify({ verifier: "v1", state: "s1", returnTo: APP_PAGE }),
    );

    let ended = false;
    void oneDrive.finishLogin().then(() => {
      ended = true;
    });
    await vi.waitFor(() => {
      expect(go).toHaveBeenCalledWith(APP_PAGE);
    });

    expect(ended).toBe(false);
    expect(replaceAddress).toHaveBeenCalledWith(START_PAGE);
    expect(formOf(server.requests[0])).toEqual({
      client_id: "68c00226-31d2-41f6-ab60-bb12fc6208f8",
      grant_type: "authorization_code",
      code: "abc",
      redirect_uri: START_PAGE,
      code_verifier: "v1",
    });
    expect(store.values.get("data-folder")).toBe("onedrive");
    expect(store.values.get("onedrive-tokens")).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh",
      expiresAt: 1_000_000 + 3_600_000,
    });
    expect(window.sessionStorage.getItem("pocket-apps-onedrive-login")).toBeNull();
  });

  it("stays on the page when the login started there", async () => {
    const { oneDrive, go, store } = setup({ address: `${START_PAGE}?code=abc&state=s1` });
    window.sessionStorage.setItem(
      "pocket-apps-onedrive-login",
      JSON.stringify({ verifier: "v1", state: "s1", returnTo: START_PAGE }),
    );

    await oneDrive.finishLogin();

    expect(go).not.toHaveBeenCalled();
    expect(store.values.get("data-folder")).toBe("onedrive");
  });

  it("rejects an answer that does not fit the login", async () => {
    const { oneDrive, server } = setup({ address: `${START_PAGE}?code=abc&state=other` });
    window.sessionStorage.setItem(
      "pocket-apps-onedrive-login",
      JSON.stringify({ verifier: "v1", state: "s1", returnTo: APP_PAGE }),
    );

    await expect(oneDrive.finishLogin()).rejects.toThrow(/passt nicht zu deiner Anmeldung/);
    expect(server.requests).toHaveLength(0);
  });

  it("rejects an answer without a saved login", async () => {
    const { oneDrive } = setup({ address: `${START_PAGE}?code=abc&state=s1` });
    window.sessionStorage.setItem("pocket-apps-onedrive-login", "not json");

    await expect(oneDrive.finishLogin()).rejects.toThrow(/passt nicht zu deiner Anmeldung/);
  });

  it("tells when the person cancels the login", async () => {
    const { oneDrive, replaceAddress } = setup({
      address: `${START_PAGE}?error=access_denied&error_description=cancel`,
    });

    await expect(oneDrive.finishLogin()).rejects.toThrow(
      "Du hast die Anmeldung bei OneDrive abgebrochen.",
    );
    expect(replaceAddress).toHaveBeenCalledWith(START_PAGE);
  });

  it("shows the description of other login errors", async () => {
    const description = setup({
      address: `${START_PAGE}?error=server_error&error_description=Kaputt`,
    });
    await expect(description.oneDrive.finishLogin()).rejects.toThrow(/nicht geklappt: Kaputt/);

    const codeOnly = setup({ address: `${START_PAGE}?error=server_error` });
    await expect(codeOnly.oneDrive.finishLogin()).rejects.toThrow(/nicht geklappt: server_error/);
  });

  it("fails when Microsoft gives no token", async () => {
    for (const change of [{ tokenStatus: 400 }, { tokenBody: { access_token: "a" } }]) {
      const { oneDrive, server, store } = setup({ address: `${START_PAGE}?code=abc&state=s1` });
      Object.assign(server, change);
      window.sessionStorage.setItem(
        "pocket-apps-onedrive-login",
        JSON.stringify({ verifier: "v1", state: "s1", returnTo: APP_PAGE }),
      );

      await expect(oneDrive.finishLogin()).rejects.toThrow(
        "Die Anmeldung bei OneDrive hat nicht geklappt. Versuche es noch einmal.",
      );
      expect(store.values.get("data-folder")).toBeUndefined();
    }
  });
});

describe("the default browser functions", () => {
  it("use the address and the history of the window", async () => {
    window.history.replaceState(null, "", "/?code=abc&state=s1#fran");
    window.sessionStorage.setItem(
      "pocket-apps-onedrive-login",
      JSON.stringify({ verifier: "v1", state: "s1", returnTo: window.location.href }),
    );
    const server = fakeServer();
    vi.stubGlobal("fetch", server.fetch);
    const store = memoryStore();

    await createOneDrive({ store }).finishLogin();

    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#fran");
    expect(store.values.get("data-folder")).toBe("onedrive");
    expect(server.fetch).toHaveBeenCalledOnce();
  });

  it("go to the Microsoft login with the location of the window", async () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      href: "http://localhost:5173/",
      assign,
    } as unknown as Location);

    void createOneDrive({ store: memoryStore() }).startLogin(false);
    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalled();
    });

    expect(String(assign.mock.calls[0]?.[0])).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A5173%2F",
    );
  });
});
