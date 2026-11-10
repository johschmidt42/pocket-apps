import { describe, expect, it, vi } from "vitest";
import { fetchJson } from "./fetch-json.ts";

describe("fetchJson", () => {
  it("gives the JSON, the HTTP error or offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ a: 1 })));
    expect(await fetchJson("https://example.org")).toEqual({ kind: "ok", json: { a: 1 } });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("", { status: 503 })));
    expect(await fetchJson("https://example.org")).toEqual({ kind: "http-error", status: 503 });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("<html>")));
    expect(await fetchJson("https://example.org")).toEqual({ kind: "bad-body" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")));
    expect(await fetchJson("https://example.org")).toEqual({ kind: "offline" });
  });
});
