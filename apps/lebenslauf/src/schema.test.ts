import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { initialData, schema } from "./schema.ts";

const STATION = {
  id: "s",
  from: "2021-03",
  to: "2024-01",
  title: "Data Engineer",
  subtitle: "",
  bullets: [],
};

function withStation(station: object) {
  const data = initialData("v");
  return {
    ...data,
    variants: [
      {
        ...data.variants[0],
        sections: [{ id: "x", title: "Work", kind: "stations", entries: [station] }],
      },
    ],
  };
}

const PROJECT = {
  id: "p",
  title: "Shop",
  role: "",
  client: "",
  from: "2024-01",
  to: "2024-06",
  description: "",
  tasks: [],
  tools: [],
};

function withProject(project: object) {
  const data = initialData("v");
  return {
    ...data,
    variants: [
      {
        ...data.variants[0],
        sections: [{ id: "x", title: "Projects", kind: "projects", entries: [project] }],
      },
    ],
  };
}

describe("lebenslauf schema", () => {
  it("starts at version 1 with one empty variant", () => {
    const data = schema.initial();

    expect(currentVersion(schema)).toBe(3);
    expect(data.person).toEqual({ name: "", contacts: [] });
    expect(data.variants).toHaveLength(1);
    expect(data.variants[0]).toMatchObject({
      name: "Mein Lebenslauf",
      design: "klassisch",
      language: "de",
      sections: [],
    });
    expect(data.activeVariantId).toBe(data.variants[0]?.id);
    expect(schema.validate.parse(initialData("x"))).toEqual(initialData("x"));
  });

  it("reads a variant without a photo field as a variant without a photo", () => {
    const data = initialData("v");
    const withoutPhoto = JSON.parse(JSON.stringify(data.variants[0])) as Record<string, unknown>;
    delete withoutPhoto.photo;

    const parsed = schema.validate.parse({ ...data, variants: [withoutPhoto] });

    expect(parsed.variants[0]?.photo).toBeNull();
  });

  it("needs an active variant that exists", () => {
    expect(schema.validate.safeParse({ ...initialData("x"), activeVariantId: "y" }).success).toBe(
      false,
    );
  });

  it("accepts a station without an end and refuses an end before the start", () => {
    expect(schema.validate.safeParse(withStation(STATION)).success).toBe(true);
    expect(schema.validate.safeParse(withStation({ ...STATION, to: null })).success).toBe(true);
    expect(schema.validate.safeParse(withStation({ ...STATION, to: "2020-12" })).success).toBe(
      false,
    );
    expect(schema.validate.safeParse(withStation({ ...STATION, from: "2021-13" })).success).toBe(
      false,
    );
  });

  it("accepts a project without a time range or without an end, and refuses a wrong range", () => {
    const valid = (project: object) => schema.validate.safeParse(withProject(project)).success;

    expect(valid(PROJECT)).toBe(true);
    expect(valid({ ...PROJECT, to: null })).toBe(true);
    expect(valid({ ...PROJECT, from: null, to: null })).toBe(true);
    expect(valid({ ...PROJECT, from: null })).toBe(false);
    expect(valid({ ...PROJECT, to: "2023-12" })).toBe(false);
  });
});
