import { describe, expect, it } from "vitest";
import { toV3 } from "./to-v3.ts";

const PROJECT = {
  id: "p1",
  title: "Data Exchange Store",
  description: "A store for data.",
  tasks: ["APIs"],
  tools: ["Python"],
};

const STATIONS = {
  id: "s2",
  title: "Work History",
  kind: "stations",
  entries: [
    { id: "w1", from: "2021-03", to: null, title: "Freelancer", subtitle: "", bullets: [] },
  ],
};

/** A file of schema version 2, as the app version 3.5 wrote it. */
const V2_DATA = {
  person: { name: "Erika Mustermann", contacts: [{ id: "c1", kind: "email", value: "e@x.de" }] },
  variants: [
    {
      id: "v1",
      name: "Standard",
      language: "en",
      design: "modern",
      photo: null,
      sections: [{ id: "s1", title: "Projects", kind: "projects", entries: [PROJECT] }, STATIONS],
    },
  ],
  activeVariantId: "v1",
};

describe("toV3", () => {
  it("gives each variant an empty profile and each project an empty role and client", () => {
    expect(toV3(V2_DATA)).toEqual({
      ...V2_DATA,
      variants: [
        {
          ...V2_DATA.variants[0],
          profile: "",
          sections: [
            {
              id: "s1",
              title: "Projects",
              kind: "projects",
              entries: [{ ...PROJECT, role: "", client: "", from: null, to: null }],
            },
            STATIONS,
          ],
        },
      ],
    });
  });

  it("refuses data that is not version 2", () => {
    expect(() =>
      toV3({ ...V2_DATA, variants: [{ design: "projektprofil", sections: [] }] }),
    ).toThrow();
  });
});
