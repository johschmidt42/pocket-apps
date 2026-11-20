import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCloudSession, finishCloudLogin, type CloudDeps } from "./cloud-login.ts";
import { createDropboxFolder, DROPBOX } from "./dropbox-folder.ts";
import { ONEDRIVE } from "./onedrive-folder.ts";
import type { KeyValueStore } from "./settings-store.ts";

const API = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const START_PAGE = "https://example.org/pocket-apps/";

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

type SentRequest = { url: string; init: RequestInit | undefined };

function argOf(request: SentRequest | undefined): unknown {
  return JSON.parse(new Headers(request?.init?.headers).get("Dropbox-API-Arg") ?? "null");
}

/** Dropbox and its login in memory: a fake `fetch` with the rules of the Dropbox API. */
function fakeDropbox() {
  const conflict = (summary: string) =>
    Response.json({ error_summary: summary, error: {} }, { status: 409 });
  const server = {
    files: new Map<string, { text: string; rev: string; time: string }>(),
    requests: [] as SentRequest[],
    tokenBody: undefined as unknown,
    status: null as number | null,
    answer: null as Response | null,
    clock: Date.parse("2026-11-20T10:00:00Z"),
    fetch: vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      server.requests.push({ url, init });
      if (url === TOKEN_URL) {
        return server.tokenBody === "not json"
          ? new Response("not json")
          : Response.json(server.tokenBody ?? { access_token: "fresh", expires_in: 14400 });
      }
      if (server.answer) return server.answer;
      if (server.status !== null) return new Response("error", { status: server.status });
      const arg = (init?.headers ? argOf({ url, init }) : null) as { path: string } | null;
      const body = (
        url.startsWith(API) && typeof init?.body === "string" ? JSON.parse(init.body) : null
      ) as {
        path: string;
      } | null;
      const path = (arg ?? body)?.path ?? "";
      const file = server.files.get(path);
      if (url === `${API}/files/get_metadata`) {
        return file
          ? Response.json({ ".tag": "file", server_modified: file.time, rev: file.rev })
          : conflict("path/not_found/..");
      }
      if (url === `${CONTENT}/files/download`) {
        return file ? new Response(file.text) : conflict("path/not_found/..");
      }
      if (url === `${API}/files/delete_v2`) {
        if (!file) return conflict("path_lookup/not_found/..");
        server.files.delete(path);
        return Response.json({ metadata: {} });
      }
      // files/upload
      const { mode } = arg as unknown as { mode: string | { ".tag": string; update: string } };
      if (mode === "add" && file) return conflict("path/conflict/file/..");
      if (typeof mode === "object" && mode.update !== file?.rev) {
        return conflict("path/conflict/file/..");
      }
      server.clock += 1000;
      const time = new Date(server.clock).toISOString().replace(/\.\d+Z$/, "Z");
      // Node's Response cannot read a jsdom Blob, so the fake keeps the text.
      const content = init?.body;
      const text = typeof content === "string" ? content : await (content as Blob).text();
      const saved = { text, rev: `rev-${String(server.clock)}`, time };
      server.files.set(path, saved);
      return Response.json({ server_modified: time, rev: saved.rev });
    }),
  };
  return server;
}

const VALID_TOKENS = { accessToken: "access", refreshToken: "refresh", expiresAt: 9_999_999 };
const OLD_TOKENS = { accessToken: "old", refreshToken: "refresh", expiresAt: 1_000_000 };

function setup(tokens: unknown = VALID_TOKENS) {
  const server = fakeDropbox();
  const store = memoryStore();
  store.values.set("dropbox-tokens", tokens);
  const navigate = vi.fn();
  const deps: Partial<CloudDeps> = {
    store,
    session: window.sessionStorage,
    fetch: server.fetch,
    address: () => `${START_PAGE}trainingsbuch.html`,
    navigate,
    replaceAddress: vi.fn(),
    now: () => 1_000_000,
  };
  const session = createCloudSession(DROPBOX, deps);
  return { server, store, navigate, deps, session, folder: createDropboxFolder(session) };
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("the Dropbox folder", () => {
  it("writes, reads and removes files in the app folder", async () => {
    const { folder, server } = setup();

    expect(folder).toMatchObject({ name: "Dropbox", kind: "dropbox" });
    expect(await folder.read("app-ideen/app-ideen.json")).toBeNull();
    expect(await folder.readBlob("app-ideen/foto.jpg")).toBeNull();

    const time = await folder.write("app-ideen/app-ideen.json", "{}");

    expect(await folder.read("app-ideen/app-ideen.json")).toEqual({
      text: "{}",
      lastModified: time,
    });
    expect(server.requests.at(-2)?.url).toBe(`${API}/files/get_metadata`);
    expect(server.requests.at(-1)?.url).toBe(`${CONTENT}/files/download`);
    expect(argOf(server.requests.at(-1))).toEqual({ path: "/app-ideen/app-ideen.json" });
    expect(new Headers(server.requests.at(-1)?.init?.headers).get("Authorization")).toBe(
      "Bearer access",
    );

    await folder.write("app-ideen/foto.jpg", new Blob(["jpeg"], { type: "image/jpeg" }));
    expect(await (await folder.readBlob("app-ideen/foto.jpg"))?.text()).toBe("jpeg");
    await folder.remove("app-ideen/foto.jpg");
    expect(await folder.readBlob("app-ideen/foto.jpg")).toBeNull();
    // A missing file is no error.
    await folder.remove("app-ideen/foto.jpg");
  });

  it("writes only if the file did not change after the check", async () => {
    const { folder, server } = setup();
    // A file without a check is overwritten, for example an image.
    await folder.write("a.json", "eins");
    expect(argOf(server.requests.at(-1))).toMatchObject({ path: "/a.json", mode: "overwrite" });

    // After a check, the write gives the revision.
    await folder.lastModified("a.json");
    await folder.write("a.json", "zwei");
    expect(argOf(server.requests.at(-1))).toMatchObject({
      mode: { ".tag": "update", update: expect.stringMatching(/^rev-/) as string },
      autorename: false,
      strict_conflict: true,
    });

    // Another device writes the file after the check.
    await folder.lastModified("a.json");
    server.files.set("/a.json", { text: "fremd", rev: "rev-other", time: "2026-11-20T11:00:00Z" });
    await expect(folder.write("a.json", "drei")).rejects.toThrow(
      "Die Datei hat sich gerade woanders geändert.",
    );
    expect(server.files.get("/a.json")?.text).toBe("fremd");
  });

  it("sees a change of another device in the same second", async () => {
    const { folder, server } = setup();
    const time = await folder.write("a.json", "eins");
    expect(await folder.lastModified("a.json")).toBe(time);

    // Dropbox gives whole seconds: the other change has the same time, but a new revision.
    const saved = server.files.get("/a.json");
    server.files.set("/a.json", { text: "fremd", rev: "rev-other", time: saved?.time ?? "" });

    const later = await folder.lastModified("a.json");
    expect(later).toBe(time + 1);
    // The same revision keeps its time.
    expect(await folder.lastModified("a.json")).toBe(later);
  });

  it("adds a new file only if nobody made it in between", async () => {
    const { folder, server } = setup();

    expect(await folder.lastModified("neu.json")).toBeNull();
    server.files.set("/neu.json", {
      text: "fremd",
      rev: "rev-other",
      time: "2026-11-20T11:00:00Z",
    });

    await expect(folder.write("neu.json", "{}")).rejects.toThrow("woanders geändert");
    expect(argOf(server.requests.at(-1))).toMatchObject({ mode: "add" });
  });

  it("saves the data file in one request, because the upload checks the revision", async () => {
    const { folder, server } = setup();
    // The store reads the data file first. It does not exist yet.
    expect(await folder.read("a.json")).toBeNull();
    server.requests.length = 0;
    const first = (await folder.writeIfUnchanged("a.json", "eins", null)) as number;
    expect(server.requests.map((request) => request.url)).toEqual([`${CONTENT}/files/upload`]);
    expect(argOf(server.requests.at(-1))).toMatchObject({ mode: "add" });
    server.requests.length = 0;

    const second = (await folder.writeIfUnchanged("a.json", "zwei", first)) as number;

    expect(typeof second).toBe("number");
    expect(server.requests.map((request) => request.url)).toEqual([`${CONTENT}/files/upload`]);
    expect(argOf(server.requests.at(-1))).toMatchObject({ mode: { ".tag": "update" } });
    expect(server.files.get("/a.json")?.text).toBe("zwei");
  });

  it("gives a conflict when another device wrote the data file", async () => {
    const { folder, server } = setup();
    // A file without a check: the folder gets the time first.
    const time = (await folder.writeIfUnchanged("a.json", "eins", null)) as number;
    expect(server.requests.map((request) => request.url)).toEqual([
      `${API}/files/get_metadata`,
      `${CONTENT}/files/upload`,
    ]);
    server.files.set("/a.json", { text: "fremd", rev: "rev-other", time: "2026-11-20T11:00:00Z" });

    expect(await folder.writeIfUnchanged("a.json", "zwei", time)).toBe("changed");
    expect(server.files.get("/a.json")?.text).toBe("fremd");

    // A look at the raw file gives the folder the new revision. The store still expects the old
    // time, so the folder checks the time and does not write.
    await folder.read("a.json");
    server.requests.length = 0;
    expect(await folder.writeIfUnchanged("a.json", "zwei", time)).toBe("changed");
    expect(server.requests.map((request) => request.url)).toEqual([`${API}/files/get_metadata`]);
  });

  it("escapes other characters than ASCII in the header", async () => {
    const { folder, server } = setup();

    await folder.readBlob("bilder/äpfel.jpg");

    expect(new Headers(server.requests.at(-1)?.init?.headers).get("Dropbox-API-Arg")).toBe(
      '{"path":"/bilder/\\u00e4pfel.jpg"}',
    );
  });

  it("gives German errors for failures", async () => {
    const { folder, server } = setup();

    server.status = 503;
    await expect(folder.lastModified("a.json")).rejects.toThrow(
      "Dropbox hat mit dem Fehler 503 geantwortet.",
    );
    server.status = 409;
    await expect(folder.readBlob("a.json")).rejects.toThrow(
      "Dropbox hat mit dem Fehler 409 geantwortet.",
    );
    server.status = null;
    server.answer = Response.json({ error_summary: "path/malformed_path/" }, { status: 409 });
    await expect(folder.remove("a.json")).rejects.toThrow("Dropbox hat mit dem Fehler 409");
    server.answer = Response.json({ id: "x" });
    await expect(folder.lastModified("a.json")).rejects.toThrow(
      "Dropbox hat eine unerwartete Antwort geschickt.",
    );
    server.answer = new Response("not json");
    await expect(folder.lastModified("a.json")).rejects.toThrow(
      "Dropbox hat eine unerwartete Antwort geschickt.",
    );
  });

  it("forgets the tokens when Dropbox rejects them", async () => {
    const { folder, server, store } = setup();
    server.status = 401;

    await expect(folder.lastModified("a.json")).rejects.toThrow(
      "Deine Anmeldung bei Dropbox gilt nicht mehr.",
    );
    expect(store.values.get("dropbox-tokens")).toBeNull();
  });
});

describe("the Dropbox login", () => {
  it("keeps the refresh token, because a refresh gives no new one", async () => {
    const { folder, store } = setup(OLD_TOKENS);

    expect(await folder.queryAccess()).toBe("granted");

    expect(store.values.get("dropbox-tokens")).toEqual({
      accessToken: "fresh",
      refreshToken: "refresh",
      expiresAt: 1_000_000 + 14_400_000,
    });
  });

  it("fails on a token answer that is not JSON", async () => {
    const { folder, server } = setup(OLD_TOKENS);
    server.tokenBody = "not json";

    await expect(folder.queryAccess()).rejects.toThrow(
      "Dropbox hat eine unerwartete Antwort geschickt.",
    );
  });

  it("asks Dropbox for a refresh token, without a new password", async () => {
    const { folder, session, navigate } = setup();

    void session.startLogin({ chooseAccount: true });
    // A new login after an ended one goes the same way.
    void folder.requestAccess();
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledTimes(2);
    });

    const url = new URL(String(navigate.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe("https://www.dropbox.com/oauth2/authorize");
    expect(url.searchParams.get("token_access_type")).toBe("offline");
    expect(url.searchParams.get("force_reauthentication")).toBeNull();
  });

  it("refreshes the token once when Dropbox rejects it, for example after a wrong clock", async () => {
    const { folder, server, store } = setup();
    let rejected = false;
    const original = server.fetch.getMockImplementation();
    server.fetch.mockImplementation((input, init) => {
      const url = input instanceof Request ? input.url : input.toString();
      const auth = new Headers(init?.headers).get("Authorization");
      if (url !== TOKEN_URL && auth === "Bearer access" && !rejected) {
        rejected = true;
        return Promise.resolve(new Response("expired", { status: 401 }));
      }
      return original?.(input, init) ?? Promise.reject(new Error("no fake"));
    });

    expect(await folder.lastModified("a.json")).toBeNull();

    expect(rejected).toBe(true);
    expect(store.values.get("dropbox-tokens")).toMatchObject({ accessToken: "fresh" });
  });

  it("makes Dropbox the picked storage after the login, and forgets other logins", async () => {
    const { deps, store } = setup(null);
    store.values.set("onedrive-tokens", VALID_TOKENS);
    window.sessionStorage.setItem(
      "pocket-apps-cloud-login",
      JSON.stringify({ provider: "dropbox", verifier: "v1", state: "s1", returnTo: START_PAGE }),
    );
    const server = fakeDropbox();
    server.tokenBody = { access_token: "a", refresh_token: "r", expires_in: 14400 };

    await finishCloudLogin([ONEDRIVE, DROPBOX], {
      ...deps,
      fetch: server.fetch,
      address: () => `${START_PAGE}?code=abc&state=s1`,
    });

    expect(store.values.get("data-folder")).toBe("dropbox");
    expect(store.values.get("dropbox-tokens")).toMatchObject({
      accessToken: "a",
      refreshToken: "r",
    });
    expect(server.requests[0]?.url).toBe(TOKEN_URL);
    expect(store.values.get("onedrive-tokens")).toBeNull();
  });
});
