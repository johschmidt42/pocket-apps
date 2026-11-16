import { describe, expect, it } from "vitest";
import { inputFiles } from "./input-files.ts";

describe("inputFiles", () => {
  it("gives the files of a file field, or none", () => {
    const input = document.createElement("input");
    input.type = "file";

    expect(inputFiles(input)).toEqual([]);
    expect(inputFiles({ files: null })).toEqual([]);
  });
});
