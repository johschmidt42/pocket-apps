import { MONTH_PATTERN, type ContactKind } from "./schema.ts";

/** The non-empty lines of a text field, without spaces at the start and the end. */
export function toLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** Like `toLines`, but "|" also separates items. Then "Python | Docker" gives two tools. */
export function toTools(text: string): string[] {
  return toLines(text.replaceAll("|", "\n"));
}

/** The text for a text field: one item per line. */
export function fromLines(lines: readonly string[]): string {
  return lines.join("\n");
}

/**
 * Gives each line a React key from its text. Lines have no IDs, and two lines can have the
 * same text. Thus the second "Python" gets the key "Python" + NUL + "2". No text has a NUL.
 */
export function keyedLines(lines: readonly string[]): { key: string; text: string }[] {
  const seen = new Map<string, number>();
  return lines.map((text) => {
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { key: count === 1 ? text : `${text}\u0000${String(count)}`, text };
  });
}

/** "Erika Maria Mustermann" → ["Erika Maria", "Mustermann"], for a design with a bold last name. */
export function splitName(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return [words.join(" "), last];
}

/** True for a month like "2024-01". */
export function isMonth(text: string): boolean {
  return MONTH_PATTERN.test(text);
}

/** "2024-01" → "01/2024". */
export function formatMonth(month: string): string {
  const [year = "", number = ""] = month.split("-");
  return `${number}/${year}`;
}

/**
 * The time range of a project: "01/2024 – 06/2024", "Since 01/2024" (`since` is the fixed word
 * of the language), or `null` for a project without a start.
 */
export function formatRange(from: string | null, to: string | null, since: string): string | null {
  if (from === null) return null;
  return to === null
    ? `${since} ${formatMonth(from)}`
    : `${formatMonth(from)} – ${formatMonth(to)}`;
}

/**
 * The web address of a contact line, for a link in the PDF. `null` for a line without an address.
 * A value without a scheme gets "https://".
 */
export function contactHref(kind: ContactKind, value: string): string | null {
  const text = value.trim();
  if (text === "") return null;
  switch (kind) {
    case "email":
      return `mailto:${text}`;
    case "phone":
      return `tel:${text.replace(/[^\d+]/g, "")}`;
    case "location":
      return null;
    case "website":
    case "linkedin":
    case "github":
      return /^https?:\/\//i.test(text) ? text : `https://${text}`;
  }
}
