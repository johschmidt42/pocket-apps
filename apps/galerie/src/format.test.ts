import { describe, expect, it } from "vitest";
import { formatDate, formatFileSize } from "./format.ts";

describe("formatFileSize", () => {
  it("gives megabytes with one decimal in German", () => {
    expect(formatFileSize(3.6 * 1024 * 1024)).toBe("3,6 MB");
    expect(formatFileSize(1024 * 1024)).toBe("1 MB");
  });

  it("gives kilobytes below 1 MB, at least 1 KB", () => {
    expect(formatFileSize(240 * 1024)).toBe("240 KB");
    expect(formatFileSize(10)).toBe("1 KB");
  });
});

describe("formatDate", () => {
  it("gives the day in German", () => {
    expect(formatDate(new Date(2022, 11, 14, 12).getTime())).toBe("14.12.2022");
  });
});
