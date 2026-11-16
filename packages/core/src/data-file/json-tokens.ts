/** The kind of a part of a JSON text. It sets the color in the raw data view. */
export type JsonTokenKind = "key" | "string" | "number" | "literal" | "punctuation" | "space";

/** A part of a JSON text. `start` is its position in the text. */
export type JsonToken = { start: number; text: string; kind: JsonTokenKind };

// A string (with an optional colon after it: then it is a key), a number, a literal, a
// punctuation mark, or white space.
const TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])|(\s+)/g;

/**
 * Splits a JSON text into parts for colors. The text must be valid JSON, for example the result of
 * `JSON.stringify(value, null, 2)`. The parts together give the text again.
 */
export function jsonTokens(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  for (const match of text.matchAll(TOKEN)) {
    const [whole, string, colon, number, literal, punctuation] = match;
    const start = match.index;
    if (string !== undefined && colon !== undefined) {
      tokens.push({ start, text: string, kind: "key" });
      tokens.push({ start: start + string.length, text: colon, kind: "punctuation" });
    } else if (string !== undefined) {
      tokens.push({ start, text: string, kind: "string" });
    } else if (number !== undefined) {
      tokens.push({ start, text: number, kind: "number" });
    } else if (literal !== undefined) {
      tokens.push({ start, text: literal, kind: "literal" });
    } else if (punctuation !== undefined) {
      tokens.push({ start, text: punctuation, kind: "punctuation" });
    } else {
      tokens.push({ start, text: whole, kind: "space" });
    }
  }
  return tokens;
}
