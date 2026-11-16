import type { Entry, When } from "./schema.ts";

/** An entry for tests. Only the tests use this file. */
export function testEntry(id: string, when: When, extra: Partial<Entry> = {}): Entry {
  return {
    id,
    title: `Eintrag ${id}`,
    description: "",
    when,
    side: "auto",
    visible: true,
    ...extra,
  };
}
