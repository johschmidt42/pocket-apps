import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { initialData, schema } from "./schema.ts";

describe("fixkosten schema", () => {
  it("starts at version 1 with one empty profile", () => {
    const data = schema.initial();

    expect(currentVersion(schema)).toBe(1);
    expect(data.profiles).toHaveLength(1);
    expect(data.profiles[0]).toMatchObject({ name: "Mein Haushalt", incomes: [], costs: [] });
    expect(data.activeProfileId).toBe(data.profiles[0]?.id);
    expect(schema.validate.parse(initialData("x"))).toEqual(initialData("x"));
  });

  it("needs an active profile that exists", () => {
    expect(schema.validate.safeParse({ ...initialData("x"), activeProfileId: "y" }).success).toBe(
      false,
    );
  });
});
