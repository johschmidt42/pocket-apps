/** The size of a stored photo in pixels: 4 : 5, like the photo frame of the design (36 × 45 mm). */
export const PHOTO_SIZE = { width: 600, height: 750 };

/** The JPEG quality of a stored photo (0 to 1). */
const JPEG_QUALITY = 0.85;

/** An error with a German message for the user. */
export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoError";
  }
}

/** A part of an image in pixels. */
export type Crop = { x: number; y: number; width: number; height: number };

/**
 * The largest part in the middle of an image with the aspect ratio `ratio` (width / height).
 * A wide image loses its left and right edge, a high image its top and bottom edge.
 */
export function centerCrop(width: number, height: number, ratio: number): Crop {
  if (width / height > ratio) {
    const cropWidth = height * ratio;
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
  }
  const cropHeight = width / ratio;
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight };
}

/**
 * Prepares a photo for the CV: cuts the middle to 4 : 5 and scales it to 600 × 750 pixels
 * as a JPEG. Then the file stays small, and the print is still sharp (about 420 dpi).
 * Fails with a `PhotoError` (German message) if the browser cannot read the image.
 */
export async function preparePhoto(file: Blob): Promise<Blob> {
  let image: ImageBitmap;
  try {
    // The browser turns the image as the camera says (EXIF orientation).
    image = await createImageBitmap(file);
  } catch {
    throw new PhotoError(
      "Die Datei ist kein Bild, das der Browser lesen kann. Bitte JPEG oder PNG wählen.",
    );
  }
  const crop = centerCrop(image.width, image.height, PHOTO_SIZE.width / PHOTO_SIZE.height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE.width;
  canvas.height = PHOTO_SIZE.height;
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoError("Der Browser kann das Bild nicht verkleinern.");
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    PHOTO_SIZE.width,
    PHOTO_SIZE.height,
  );
  image.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PhotoError("Der Browser kann das Bild nicht als JPEG speichern."));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/** The content of a file as a data URL, for an `<img>`. */
export function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("The file cannot be read."));
    };
    reader.readAsDataURL(blob);
  });
}
