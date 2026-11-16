import { describe, expect, it } from "vitest";
import { jsonTokens, type JsonTokenKind } from "./json-tokens.ts";

describe("jsonTokens", () => {
  it("finds keys, strings, numbers, literals, punctuation and space", () => {
    const text = JSON.stringify(
      { app: "demo", count: -1.5e3, ok: true, none: null, list: [1, 'a "b"'] },
      null,
      2,
    );
    const tokens = jsonTokens(text);

    expect(tokens.map((token) => token.text).join("")).toBe(text);
    const textsOf = (kind: JsonTokenKind) =>
      tokens.filter((token) => token.kind === kind).map((token) => token.text);
    expect(textsOf("key")).toEqual(['"app"', '"count"', '"ok"', '"none"', '"list"']);
    expect(textsOf("string")).toEqual(['"demo"', '"a \\"b\\""']);
    expect(textsOf("number")).toEqual(["-1500", "1"]);
    expect(textsOf("literal")).toEqual(["true", "null"]);
    expect(textsOf("punctuation")).toContain(":");
    expect(textsOf("punctuation")).toContain("[");
    expect(textsOf("space").length).toBeGreaterThan(0);
  });

  it("gives each part its position in the text", () => {
    expect(jsonTokens('{"a":1}')).toEqual([
      { start: 0, text: "{", kind: "punctuation" },
      { start: 1, text: '"a"', kind: "key" },
      { start: 4, text: ":", kind: "punctuation" },
      { start: 5, text: "1", kind: "number" },
      { start: 6, text: "}", kind: "punctuation" },
    ]);
  });
});
