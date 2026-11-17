import { EXIF_HEAD_BYTES, findExifThumbnail, rotationOf, type Rotation } from "./exif-thumbnail.ts";

/** A small image for the list: an object URL and the rotation that makes it stand upright. */
export type Thumbnail = { url: string; rotation: Rotation };

/** Makes the thumbnail of an image file. Unit tests give a fake, because jsdom cannot decode. */
export type MakeThumbnail = (file: File) => Promise<Thumbnail>;

/** The width of a made thumbnail in pixels: sharp at 64 CSS pixels on a retina screen. */
const THUMBNAIL_WIDTH = 160;

/**
 * Makes the thumbnail of an image file. It tries the fast way first:
 * 1. The EXIF preview image in the first 128 KB of a JPEG (96 % of the photos in a test).
 * 2. Else it decodes the image, scales it down and keeps a small WebP.
 * An SVG file is its own thumbnail. Rejects if the browser cannot decode the file.
 */
export async function createThumbnail(file: File): Promise<Thumbnail> {
  if (file.name.toLowerCase().endsWith(".svg")) {
    return { url: URL.createObjectURL(file), rotation: 0 };
  }
  const exif = findExifThumbnail(await file.slice(0, EXIF_HEAD_BYTES).arrayBuffer());
  if (exif) {
    const blob = new Blob([exif.bytes], { type: "image/jpeg" });
    return { url: URL.createObjectURL(blob), rotation: rotationOf(exif.orientation) };
  }
  // The browser turns the image as the camera says (EXIF orientation).
  const bitmap = await createImageBitmap(file, {
    resizeWidth: THUMBNAIL_WIDTH,
    resizeQuality: "medium",
  });
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser has no 2D canvas.");
    context.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
    return { url: URL.createObjectURL(blob), rotation: 0 };
  } finally {
    bitmap.close();
  }
}

/** Frees the memory of a thumbnail. */
export function releaseThumbnail(thumbnail: Thumbnail): void {
  URL.revokeObjectURL(thumbnail.url);
}
