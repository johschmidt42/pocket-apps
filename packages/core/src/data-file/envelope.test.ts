import { describe, expect, it } from "vitest";
import { parseEnvelope, serializeEnvelope } from "./envelope.ts";
import { DataFileError } from "./errors.ts";

describe("serializeEnvelope", () => {
  it("writes the frame around the data as formatted JSON", () => {
    const text = serializeEnvelope({
      app: "demo",
      schemaVersion: 2,
      appVersion: "1.2",
      data: { items: [] },
      now: new Date("2026-11-09T12:00:00.000Z"),
    });

    expect(JSON.parse(text)).toEqual({
      app: "demo",
      schemaVersion: 2,
      savedWith: "1.2",
      savedAt: "2026-11-09T12:00:00.000Z",
      data: { items: [] },
    });
    expect(text.endsWith("\n")).toBe(true);
  });

  it("uses the current time when no time is given", () => {
    const text = serializeEnvelope({ app: "demo", schemaVersion: 1, appVersion: "1", data: null });

    expect(Number.isNaN(Date.parse(parseEnvelope(text).savedAt))).toBe(false);
  });
});

describe("parseEnvelope", () => {
  it("reads a valid file", () => {
    const text = serializeEnvelope({ app: "demo", schemaVersion: 1, appVersion: "1", data: 42 });

    expect(parseEnvelope(text)).toMatchObject({ app: "demo", schemaVersion: 1, data: 42 });
  });

  it("rejects text that is not JSON", () => {
    expect(() => parseEnvelope("not json")).toThrow(
      expect.objectContaining({ code: "invalid-json" }),
    );
  });

  it("rejects JSON without the frame", () => {
    expect(() => parseEnvelope(JSON.stringify({ items: [] }))).toThrow(DataFileError);
    expect(() => parseEnvelope(JSON.stringify({ items: [] }))).toThrow(
      expect.objectContaining({ code: "invalid-envelope" }),
    );
  });
});
