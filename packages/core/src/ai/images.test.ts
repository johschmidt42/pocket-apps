import { describe, expect, it } from "vitest";
import { imageForAi, imageMessage, MAX_IMAGE_BYTES } from "./images.ts";

describe("images for the AI", () => {
  it("reads an image as base64", async () => {
    const file = new Blob([new Uint8Array([104, 105])], { type: "image/png" });
    expect(await imageForAi(file)).toEqual({
      kind: "ok",
      image: { mediaType: "image/png", base64: "aGk=" },
    });
  });

  it("reads a large image in parts", async () => {
    const bytes = new Uint8Array(0x8000 + 3).fill(65);
    const result = await imageForAi(new Blob([bytes], { type: "image/jpeg" }));
    expect(result.kind === "ok" && atob(result.image.base64).length).toBe(bytes.length);
  });

  it("refuses other formats and too large images", async () => {
    expect(await imageForAi(new Blob(["x"], { type: "image/heic" }))).toEqual({
      kind: "wrong-type",
    });
    const big = new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: "image/jpeg" });
    expect(await imageForAi(big)).toEqual({ kind: "too-large" });
    expect(imageMessage({ kind: "wrong-type" })).toBe(
      "Die KI liest nur Bilder im Format JPEG, PNG, GIF oder WebP.",
    );
    expect(imageMessage({ kind: "too-large" })).toBe(
      "Das Bild ist größer als 3,75 MB. Bitte wähle ein kleineres Bild.",
    );
  });
});
