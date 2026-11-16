import { describe, expect, it } from "vitest";
import { parseDescription, parseSpans } from "./description.ts";

describe("parseSpans", () => {
  it("finds bold text between two pairs of stars", () => {
    expect(parseSpans("Bei **Datamesh** in Köln")).toEqual([
      { start: 0, text: "Bei ", bold: false },
      { start: 4, text: "Datamesh", bold: true },
      { start: 16, text: " in Köln", bold: false },
    ]);
    expect(parseSpans("**fett**")).toEqual([{ start: 0, text: "fett", bold: true }]);
  });

  it("keeps single stars and open pairs as text", () => {
    expect(parseSpans("2 * 3 und **offen")).toEqual([
      { start: 0, text: "2 * 3 und **offen", bold: false },
    ]);
    expect(parseSpans("")).toEqual([]);
  });
});

describe("parseDescription", () => {
  it("makes a list from lines with a bullet", () => {
    const text = "Datamesh GmbH\n· AI hub in AWS\n- Computer vision\n* Projekte\n• Kunden";
    expect(parseDescription(text)).toEqual([
      {
        kind: "paragraph",
        line: 0,
        lines: [{ line: 0, spans: [{ start: 0, text: "Datamesh GmbH", bold: false }] }],
      },
      {
        kind: "list",
        line: 1,
        items: [
          { line: 1, spans: [{ start: 0, text: "AI hub in AWS", bold: false }] },
          { line: 2, spans: [{ start: 0, text: "Computer vision", bold: false }] },
          { line: 3, spans: [{ start: 0, text: "Projekte", bold: false }] },
          { line: 4, spans: [{ start: 0, text: "Kunden", bold: false }] },
        ],
      },
    ]);
  });

  it("starts a new paragraph after an empty line and after a list", () => {
    const blocks = parseDescription("Eins\nzwei\n\n  \nDrei\n- Punkt\nVier");
    expect(blocks.map((block) => block.kind)).toEqual([
      "paragraph",
      "paragraph",
      "list",
      "paragraph",
    ]);
    expect(blocks[0]).toMatchObject({ lines: [{ line: 0 }, { line: 1 }] });
  });

  it("needs a space after the bullet", () => {
    expect(parseDescription("-5 Grad")[0]?.kind).toBe("paragraph");
    expect(parseDescription("**fett**")[0]?.kind).toBe("paragraph");
    expect(parseDescription("")).toEqual([]);
  });
});
