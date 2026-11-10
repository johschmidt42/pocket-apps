/** The result of one request. A failed request is a value, never an exception. */
export type FetchResult =
  | { kind: "ok"; json: unknown }
  | { kind: "offline" }
  /** The server answered, but not with JSON. */
  | { kind: "bad-body" }
  | { kind: "http-error"; status: number };

export type FetchJson = (url: string) => Promise<FetchResult>;

/** Gets JSON from a URL. Catches all errors. Does not log them. */
export const fetchJson: FetchJson = async (url) => {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { kind: "offline" };
  }
  if (!response.ok) return { kind: "http-error", status: response.status };
  try {
    return { kind: "ok", json: await response.json() };
  } catch {
    return { kind: "bad-body" };
  }
};
