import { describe, expect, it } from "vitest";
import {
  contactHref,
  formatMonth,
  formatRange,
  fromLines,
  isMonth,
  keyedLines,
  splitName,
  toLines,
  toTools,
} from "./text.ts";

describe("lines", () => {
  it("keeps the non-empty lines without spaces", () => {
    expect(toLines("  Python \n\n Docker\n  ")).toEqual(["Python", "Docker"]);
    expect(fromLines(["a", "b"])).toBe("a\nb");
  });

  it('also splits tools at "|"', () => {
    expect(toTools("Azure | Terraform |Python\nDocker")).toEqual([
      "Azure",
      "Terraform",
      "Python",
      "Docker",
    ]);
  });

  it("gives equal lines different keys", () => {
    expect(keyedLines(["a", "b", "a"]).map((line) => line.key)).toEqual(["a", "b", "a\u00002"]);
  });
});

describe("months", () => {
  it("checks and formats a month", () => {
    expect(isMonth("2024-01")).toBe(true);
    expect(isMonth("2024-13")).toBe(false);
    expect(isMonth("")).toBe(false);
    expect(formatMonth("2024-01")).toBe("01/2024");
  });

  it("splits a name into the first names and the last name", () => {
    expect(splitName(" Erika Maria  Mustermann ")).toEqual(["Erika Maria", "Mustermann"]);
    expect(splitName("Erika")).toEqual(["", "Erika"]);
  });

  it("formats the time range of a project", () => {
    expect(formatRange("2024-01", "2024-06", "Since")).toBe("01/2024 – 06/2024");
    expect(formatRange("2024-01", null, "Seit")).toBe("Seit 01/2024");
    expect(formatRange(null, null, "Since")).toBeNull();
  });
});

describe("contactHref", () => {
  it("makes a link for each kind with an address", () => {
    expect(contactHref("email", " erika@example.com ")).toBe("mailto:erika@example.com");
    expect(contactHref("phone", "+49 170 123-45")).toBe("tel:+4917012345");
    expect(contactHref("website", "erika.de")).toBe("https://erika.de");
    expect(contactHref("linkedin", "https://linkedin.com/in/erika")).toBe(
      "https://linkedin.com/in/erika",
    );
    expect(contactHref("github", "github.com/erika")).toBe("https://github.com/erika");
  });

  it("makes no link for a place or an empty value", () => {
    expect(contactHref("location", "Köln")).toBeNull();
    expect(contactHref("email", "  ")).toBeNull();
  });
});
