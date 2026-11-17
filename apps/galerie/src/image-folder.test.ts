import { describe, expect, it } from "vitest";
import { readImageFolder } from "./image-folder.ts";

/** A file as `<input webkitdirectory>` gives it: with the path in the picked folder. */
function fileAt(path: string): File {
  const file = new File(["x"], path.split("/").at(-1) ?? path);
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

/** A fake for `URL.createObjectURL`, which jsdom does not have. */
const urlOf = (file: File) => `blob:${file.name}`;

describe("readImageFolder", () => {
  it("finds the images, also in subfolders, and sorts them by path with numbers", () => {
    const folder = readImageFolder(
      [
        fileAt("Urlaub/bild-10.jpg"),
        fileAt("Urlaub/notizen.txt"),
        fileAt("Urlaub/bild-2.JPG"),
        fileAt("Urlaub/Strand/meer.png"),
        fileAt("Urlaub/iphone.heic"),
      ],
      urlOf,
    );
    expect(folder.name).toBe("Urlaub");
    expect(folder.images.map((image) => image.path)).toEqual([
      "bild-2.JPG",
      "bild-10.jpg",
      "iphone.heic",
      "Strand/meer.png",
    ]);
    expect(folder.images[3]).toMatchObject({
      name: "meer.png",
      format: "PNG",
      kind: "browser",
      url: "blob:meer.png",
    });
    expect(folder.images[2]).toMatchObject({ format: "HEIC", kind: "other" });
  });

  it("skips hidden files and files without an extension", () => {
    const folder = readImageFolder(
      [fileAt("Fotos/._bild.jpg"), fileAt("Fotos/.DS_Store"), fileAt("Fotos/README")],
      urlOf,
    );
    expect(folder).toEqual({ name: "Fotos", images: [] });
  });

  it("gives an empty folder for no files", () => {
    expect(readImageFolder([], urlOf)).toEqual({ name: "", images: [] });
  });
});
