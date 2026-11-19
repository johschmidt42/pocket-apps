// Images for a request to the AI, for example a photo of a whiteboard.

/** The image formats that both providers accept. */
export const AI_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export type AiImageType = (typeof AI_IMAGE_TYPES)[number];

/** An image as base64 text, without the "data:" prefix. */
export type AiImage = { mediaType: AiImageType; base64: string };

/**
 * Claude accepts images up to 5 MiB as base64 text. Base64 is 4/3 of the file size, so the file
 * can have up to 3.75 MiB.
 */
export const MAX_IMAGE_BYTES = (5 * 1024 * 1024 * 3) / 4;

/**
 * The longest edge of an image for the AI, in pixels. Claude makes larger images smaller itself,
 * so more pixels only cost upload time. A camera photo of a whiteboard stays readable.
 */
export const MAX_IMAGE_EDGE = 1568;

/** The JPEG quality of a smaller copy: small files, and the text on a photo stays sharp. */
const JPEG_QUALITY = 0.85;

/**
 * Makes an image smaller for the AI. Returns a JPEG copy, or `null` to keep the file: when the
 * file already fits, or when the browser cannot read it.
 */
export type ShrinkImage = (file: Blob) => Promise<Blob | null>;

/** The number of bytes for each call of `String.fromCharCode()`. */
const CHUNK_BYTES = 0x8000;

export type ImageCheck =
  { kind: "ok"; image: AiImage } | { kind: "wrong-type" } | { kind: "too-large" };

function isImageType(type: string): type is AiImageType {
  return AI_IMAGE_TYPES.some((item) => item === type);
}

function toBase64(bytes: Uint8Array): string {
  let text = "";
  // In parts: a very long argument list for String.fromCharCode() can fail.
  for (let start = 0; start < bytes.length; start += CHUNK_BYTES) {
    text += String.fromCharCode(...bytes.subarray(start, start + CHUNK_BYTES));
  }
  return btoa(text);
}

/**
 * The browser makes the image smaller: a camera photo (often 3 to 6 MB, 4000 pixels wide) or an
 * image in another format, for example HEIC. `createImageBitmap()` turns the photo by its EXIF
 * orientation.
 */
export const shrinkInBrowser: ShrinkImage = async (file) => {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // The browser cannot read the image. The size and type check decides.
    return null;
  }
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && isImageType(file.type) && file.size <= MAX_IMAGE_BYTES) {
    bitmap.close();
    return null;
  }
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale),
  );
  const context = canvas.getContext("2d");
  if (context) context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Without a 2D context, the copy would be empty: keep the file.
  return context ? canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY }) : null;
};

/**
 * Reads a picked file (for example from `FileButton` or `CameraButton`) as an image for the AI.
 * A large image becomes a smaller JPEG first. `shrink` is only for tests.
 */
export async function imageForAi(
  file: Blob,
  shrink: ShrinkImage = shrinkInBrowser,
): Promise<ImageCheck> {
  if (!file.type.startsWith("image/")) return { kind: "wrong-type" };
  const image = (await shrink(file)) ?? file;
  if (!isImageType(image.type)) return { kind: "wrong-type" };
  if (image.size > MAX_IMAGE_BYTES) return { kind: "too-large" };
  const bytes = new Uint8Array(await image.arrayBuffer());
  return { kind: "ok", image: { mediaType: image.type, base64: toBase64(bytes) } };
}

/** The problem with an image as a German sentence. */
export function imageMessage(check: Exclude<ImageCheck, { kind: "ok" }>): string {
  switch (check.kind) {
    case "wrong-type":
      return "Die KI liest nur Bilder im Format JPEG, PNG, GIF oder WebP.";
    case "too-large":
      return "Das Bild ist größer als 3,75 MB. Bitte wähle ein kleineres Bild.";
  }
}
