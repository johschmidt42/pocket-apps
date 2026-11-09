import { describe, expect, it } from "vitest";
import { z } from "zod";
import { serializeEnvelope } from "./envelope.ts";
import { loadData } from "./migrate.ts";
import { currentVersion, defineDataSchema, type Migration } from "./schema.ts";

// Version 1: { names: string[] }
// Version 2: { people: { name }[] }
// Version 3: { people: { name, age }[] }
const schema = defineDataSchema({
  app: "demo",
  validate: z.object({ people: z.array(z.object({ name: z.string(), age: z.number() })) }),
  initial: () => ({ people: [] }),
  migrations: [
    (data) => {
      const v1 = z.object({ names: z.array(z.string()) }).parse(data);
      return { people: v1.names.map((name) => ({ name })) };
    },
    (data) => {
      const v2 = z.object({ people: z.array(z.object({ name: z.string() })) }).parse(data);
      return { people: v2.people.map((person) => ({ ...person, age: 0 })) };
    },
  ],
});

function file(app: string, schemaVersion: number, data: unknown, savedWith = "1.0.0"): string {
  return serializeEnvelope({ app, schemaVersion, appVersion: savedWith, data });
}

describe("currentVersion", () => {
  it("is 1 + number of migrations", () => {
    expect(currentVersion(schema)).toBe(3);
  });
});

describe("loadData", () => {
  it("returns current data without migration", () => {
    const result = loadData(file("demo", 3, { people: [{ name: "Ada", age: 36 }] }), schema);

    expect(result).toEqual({ data: { people: [{ name: "Ada", age: 36 }] }, migratedFrom: null });
  });

  it("runs all migrations from version 1 to the current version", () => {
    const result = loadData(file("demo", 1, { names: ["Ada"] }), schema);

    expect(result).toEqual({ data: { people: [{ name: "Ada", age: 0 }] }, migratedFrom: 1 });
  });

  it("runs only the open migrations", () => {
    const result = loadData(file("demo", 2, { people: [{ name: "Ada" }] }), schema);

    expect(result.migratedFrom).toBe(2);
    expect(result.data.people[0]).toEqual({ name: "Ada", age: 0 });
  });

  it("rejects a file of another app", () => {
    expect(() => loadData(file("other", 3, {}), schema)).toThrow(
      expect.objectContaining({ code: "wrong-app" }),
    );
  });

  it("rejects a file from a newer app version", () => {
    const load = () => loadData(file("demo", 4, {}, "9.9.9"), schema);

    expect(load).toThrow(expect.objectContaining({ code: "too-new" }));
    expect(load).toThrow(/9\.9\.9/);
  });

  it("rejects data that does not match the schema", () => {
    expect(() => loadData(file("demo", 3, { people: "nobody" }), schema)).toThrow(
      expect.objectContaining({ code: "invalid-data" }),
    );
  });

  it("reports a missing migration", () => {
    const withHole: Migration[] = [];
    withHole.length = 1;
    const broken = defineDataSchema({ ...schema, migrations: withHole });

    expect(() => loadData(file("demo", 1, {}), broken)).toThrow(
      expect.objectContaining({ code: "missing-migration" }),
    );
  });
});
