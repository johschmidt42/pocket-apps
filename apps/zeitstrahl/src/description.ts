/**
 * A small text format for the description of an entry. It knows three rules:
 * - A line that starts with "-", "*", "•" or "·" and a space is a list item.
 * - `**text**` is bold.
 * - An empty line starts a new paragraph.
 * All other text stays as it is. The app renders the result as React elements, never as HTML.
 */

/** A part of a line: bold or normal text. `start` is its position in the line. */
export type Span = { start: number; text: string; bold: boolean };

/** A line of a paragraph or a list item. `line` is its line number in the text. */
export type Line = { line: number; spans: Span[] };

export type Block =
  | { kind: "paragraph"; line: number; lines: Line[] }
  | { kind: "list"; line: number; items: Line[] };

const LIST_ITEM = /^\s*[-*•·]\s+(.*)$/;
const BOLD = /\*\*(.+?)\*\*/g;

/** Splits a line into normal and bold parts. */
export function parseSpans(text: string): Span[] {
  const spans: Span[] = [];
  let position = 0;
  for (const match of text.matchAll(BOLD)) {
    if (match.index > position) {
      spans.push({ start: position, text: text.slice(position, match.index), bold: false });
    }
    spans.push({ start: match.index, text: match[1] ?? "", bold: true });
    position = match.index + match[0].length;
  }
  if (position < text.length) {
    spans.push({ start: position, text: text.slice(position), bold: false });
  }
  return spans;
}

/** Splits a description into paragraphs and lists. */
export function parseDescription(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  text.split("\n").forEach((raw, line) => {
    const content = raw.trimEnd();
    if (content.trim() === "") {
      current = null;
      return;
    }
    const item = LIST_ITEM.exec(content);
    if (item) {
      const entry = { line, spans: parseSpans(item[1] ?? "") };
      if (current?.kind === "list") {
        current.items.push(entry);
      } else {
        current = { kind: "list", line, items: [entry] };
        blocks.push(current);
      }
      return;
    }
    const entry = { line, spans: parseSpans(content.trim()) };
    if (current?.kind === "paragraph") {
      current.lines.push(entry);
    } else {
      current = { kind: "paragraph", line, lines: [entry] };
      blocks.push(current);
    }
  });
  return blocks;
}
