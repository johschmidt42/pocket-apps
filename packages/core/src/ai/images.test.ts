import { describe, expect, it, vi } from "vitest";
import { imageForAi, imageMessage, MAX_IMAGE_BYTES, shrinkInBrowser } from "./images.ts";

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

  it("uses the smaller copy of a large photo", async () => {
    const photo = new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: "image/jpeg" });
    const shrink = vi.fn(() => Promise.resolve(new Blob(["ok"], { type: "image/jpeg" })));

    expect(await imageForAi(photo, shrink)).toEqual({
      kind: "ok",
      image: { mediaType: "image/jpeg", base64: "b2s=" },
    });
    expect(shrink).toHaveBeenCalledWith(photo);
  });

  it("refuses files that are not images, without a look at the content", async () => {
    const shrink = vi.fn(() => Promise.resolve(null));

    expect(await imageForAi(new Blob(["x"], { type: "text/plain" }), shrink)).toEqual({
      kind: "wrong-type",
    });
    expect(shrink).not.toHaveBeenCalled();
  });
});

/** A stand-in for an image that the browser read. */
function fakeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() };
}

/** Replaces `createImageBitmap()` and `OffscreenCanvas`. jsdom has neither. */
function fakeBrowser(bitmap: ReturnType<typeof fakeBitmap>, withContext = true) {
  const drawImage = vi.fn();
  const convertToBlob = vi.fn(() => Promise.resolve(new Blob(["jpeg"], { type: "image/jpeg" })));
  const canvases: { width: number; height: number }[] = [];
  vi.stubGlobal("createImageBitmap", () => Promise.resolve(bitmap));
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        canvases.push(this);
      }
      getContext() {
        return withContext ? { drawImage } : null;
      }
      convertToBlob = convertToBlob;
    },
  );
  return { drawImage, convertToBlob, canvases };
}

describe("shrinkInBrowser", () => {
  it("makes a camera photo smaller, as JPEG", async () => {
    const bitmap = fakeBitmap(4000, 3000);
    const browser = fakeBrowser(bitmap);

    const copy = await shrinkInBrowser(new Blob(["big"], { type: "image/jpeg" }));

    expect(copy?.type).toBe("image/jpeg");
    expect(browser.canvases).toEqual([expect.objectContaining({ width: 1568, height: 1176 })]);
    expect(browser.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1568, 1176);
    expect(browser.convertToBlob).toHaveBeenCalledWith({ type: "image/jpeg", quality: 0.85 });
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("keeps a small image in a format of the AI", async () => {
    const bitmap = fakeBitmap(800, 600);
    const browser = fakeBrowser(bitmap);

    expect(await shrinkInBrowser(new Blob(["small"], { type: "image/png" }))).toBeNull();
    expect(browser.canvases).toEqual([]);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("turns a small image in another format into JPEG", async () => {
    const browser = fakeBrowser(fakeBitmap(800, 600));

    expect((await shrinkInBrowser(new Blob(["x"], { type: "image/heic" })))?.type).toBe(
      "image/jpeg",
    );
    expect(browser.canvases).toEqual([expect.objectContaining({ width: 800, height: 600 })]);
  });

  it("keeps the file when the browser cannot read or draw it", async () => {
    vi.stubGlobal("createImageBitmap", () =>
      Promise.reject(new DOMException("bad", "InvalidStateError")),
    );
    expect(await shrinkInBrowser(new Blob(["x"], { type: "image/jpeg" }))).toBeNull();

    const bitmap = fakeBitmap(4000, 3000);
    fakeBrowser(bitmap, false);
    expect(await shrinkInBrowser(new Blob(["x"], { type: "image/jpeg" }))).toBeNull();
    expect(bitmap.close).toHaveBeenCalled();
  });
});
