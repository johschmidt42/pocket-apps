import { describe, expect, it } from "vitest";
import { toV2 } from "./to-v2.ts";

/** A file of schema version 1, as the app version 1.0 wrote it. */
const V1_DATA = {
  person: { name: "Erika Mustermann", contacts: [{ id: "c1", kind: "email", value: "e@x.de" }] },
  variants: [
    {
      id: "v1",
      name: "Standard",
      language: "en",
      design: "klassisch",
      photo: "foto-v1.jpg",
      sections: [{ id: "s1", title: "Skills", kind: "list", entries: [] }],
    },
  ],
  activeVariantId: "v1",
};

describe("toV2", () => {
  it("keeps the data as it is", () => {
    expect(toV2(V1_DATA)).toEqual(V1_DATA);
  });

  it("refuses data that is not version 1", () => {
    expect(() => toV2({ ...V1_DATA, variants: [{ design: "modern" }] })).toThrow();
  });
});
