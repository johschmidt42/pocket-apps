import { describe, expect, it } from "vitest";
import { formatInteger, formatWhen, plural } from "./format.ts";

describe("format", () => {
  it("writes the day with the weekday, and the time if there is one", () => {
    expect(formatWhen({ date: "2027-06-12", time: "14:30" })).toBe(
      "Samstag, 12. Juni 2027, 14:30 Uhr",
    );
    expect(formatWhen({ date: "2027-07-23", time: null })).toBe("Freitag, 23. Juli 2027");
  });

  it("writes numbers with the correct word", () => {
    expect(formatInteger(5137)).toBe("5.137");
    expect(plural(1, "Tag", "Tage")).toBe("1 Tag");
    expect(plural(3, "Tag", "Tage")).toBe("3 Tage");
  });
});
