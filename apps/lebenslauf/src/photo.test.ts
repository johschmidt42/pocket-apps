import { describe, expect, it } from "vitest";
import { centerCrop, toDataUrl } from "./photo.ts";

describe("centerCrop", () => {
  it("cuts the left and right edge of a wide image", () => {
    expect(centerCrop(1000, 500, 0.8)).toEqual({ x: 300, y: 0, width: 400, height: 500 });
  });

  it("cuts the top and bottom edge of a high image", () => {
    expect(centerCrop(400, 1000, 0.8)).toEqual({ x: 0, y: 250, width: 400, height: 500 });
  });

  it("keeps an image with the right ratio", () => {
    expect(centerCrop(600, 750, 0.8)).toEqual({ x: 0, y: 0, width: 600, height: 750 });
  });
});

describe("toDataUrl", () => {
  it("gives the content as a data URL", async () => {
    expect(await toDataUrl(new Blob(["hi"], { type: "text/plain" }))).toBe(
      "data:text/plain;base64,aGk=",
    );
  });
});
