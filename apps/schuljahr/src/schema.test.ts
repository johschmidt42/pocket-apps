import { currentVersion } from "@pocket-apps/core/data-file";
import { describe, expect, it } from "vitest";
import { schema } from "./schema.ts";
import { bayern2026 } from "./test-data.ts";

describe("schuljahr schema", () => {
  it("is at version 1 and starts without a school year", () => {
    expect(currentVersion(schema)).toBe(1);
    expect(schema.initial()).toEqual({ selected: null, years: [] });
  });

  it("validates the stored school years", () => {
    const data = { selected: { state: "DE-BY", startYear: 2026 }, years: [bayern2026()] };
    expect(schema.validate.parse(data)).toEqual(data);
    expect(
      schema.validate.safeParse({ ...data, selected: { state: "DE-XX", startYear: 2026 } }).success,
    ).toBe(false);
    expect(
      schema.validate.safeParse({
        ...data,
        years: [
          {
            ...bayern2026(),
            holidays: [{ id: "1", kind: "school", name: "X", start: "bald", end: "2026-11-02" }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
