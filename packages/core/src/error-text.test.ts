import { describe, expect, it } from "vitest";
import { errorText } from "./error-text.ts";

describe("errorText", () => {
  it("gives the message of an error, or the value as text", () => {
    expect(errorText(new Error("kaputt"))).toBe("kaputt");
    expect(errorText("kaputt")).toBe("kaputt");
    expect(errorText(42)).toBe("42");
  });
});
