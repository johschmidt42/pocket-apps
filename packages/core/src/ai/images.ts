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

/** Reads a picked file (for example from `FileButton`) as an image for the AI. */
export async function imageForAi(file: Blob): Promise<ImageCheck> {
  if (!isImageType(file.type)) return { kind: "wrong-type" };
  if (file.size > MAX_IMAGE_BYTES) return { kind: "too-large" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { kind: "ok", image: { mediaType: file.type, base64: toBase64(bytes) } };
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
