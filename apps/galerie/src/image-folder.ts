/** Image formats that Chrome and Edge can show. */
const BROWSER_FORMATS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg", "ico", "jxl"];

/** Image formats that Chrome and Edge cannot show (photos from phones and cameras). */
const OTHER_FORMATS = [
  "heic",
  "heif",
  "tif",
  "tiff",
  "dng",
  "cr2",
  "cr3",
  "nef",
  "arw",
  "raf",
  "orf",
];

/** An image file in the picked folder. */
export type ImageEntry = {
  /** The path in the picked folder, without the name of the folder: "2024/bild.jpg". The ID. */
  path: string;
  /** The file name: "bild.jpg". */
  name: string;
  /** The file extension in capitals: "JPG". */
  format: string;
  /** "browser": the browser can show the image. "other": an image format it cannot show. */
  kind: "browser" | "other";
  file: File;
  /** The object URL of the file for the preview. Freed when the user picks another folder. */
  url: string;
};

/** The images of the picked folder, sorted by path. */
export type ImageFolder = {
  /** The name of the picked folder, or "" if the folder had no files. */
  name: string;
  images: ImageEntry[];
};

/**
 * Finds the images in the files of a picked folder (from `FolderButton`).
 * It skips other files and hidden files (for example "._bild.jpg" from macOS on a USB disk).
 * It sorts by path, with numbers in their order: "bild-2.jpg" before "bild-10.jpg".
 * `createUrl` makes the URL of each image file (in the app `URL.createObjectURL`).
 */
export function readImageFolder(files: File[], createUrl: (file: File) => string): ImageFolder {
  const name = files[0]?.webkitRelativePath.split("/")[0] ?? "";
  const images: ImageEntry[] = [];
  for (const file of files) {
    const entry = toImageEntry(file, createUrl);
    if (entry) images.push(entry);
  }
  images.sort((a, b) => a.path.localeCompare(b.path, "de", { numeric: true }));
  return { name, images };
}

function toImageEntry(file: File, createUrl: (file: File) => string): ImageEntry | null {
  if (file.name.startsWith(".")) return null;
  const dot = file.name.lastIndexOf(".");
  if (dot < 0) return null;
  const extension = file.name.slice(dot + 1).toLowerCase();
  const kind = BROWSER_FORMATS.includes(extension)
    ? "browser"
    : OTHER_FORMATS.includes(extension)
      ? "other"
      : null;
  if (kind === null) return null;
  // The path without the name of the picked folder.
  const path = file.webkitRelativePath.split("/").slice(1).join("/");
  return {
    path,
    name: file.name,
    format: extension.toUpperCase(),
    kind,
    file,
    url: createUrl(file),
  };
}
