import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { MakeThumbnail } from "./thumbnail.ts";

/** A file as `<input webkitdirectory>` gives it: with its path in the picked folder. */
function fileAt(path: string, size = 3): File {
  const file = new File(["x".repeat(size)], path.split("/").at(-1) ?? path, {
    lastModified: new Date(2022, 11, 14, 12).getTime(),
  });
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

const URLAUB = [
  fileAt("Urlaub/strand.jpg", 3.6 * 1024 * 1024),
  fileAt("Urlaub/hochformat.jpg"),
  fileAt("Urlaub/kaputt.jpg"),
  fileAt("Urlaub/iphone.heic"),
  fileAt("Urlaub/notizen.txt"),
];

/** A fake thumbnail maker: jsdom cannot decode images. */
const makeThumbnail: MakeThumbnail = (file) =>
  file.name === "kaputt.jpg"
    ? Promise.reject(new Error("cannot decode"))
    : Promise.resolve({
        url: `thumb:${file.name}`,
        rotation: file.name === "hochformat.jpg" ? 90 : 0,
      });

/** jsdom has no IntersectionObserver. This one reports each row as visible at once. */
class AllVisibleObserver {
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element): void {
    queueMicrotask(() => {
      this.callback(
        [{ target, isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    });
  }
  unobserve(): void {
    // Nothing to do.
  }
  disconnect(): void {
    // Nothing to do.
  }
}

let revoked: string[] = [];

beforeEach(() => {
  revoked = [];
  vi.stubGlobal("IntersectionObserver", AllVisibleObserver);
  // jsdom has no object URLs.
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (file: File) => `blob:${file.name}`,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (url: string) => {
      revoked.push(url);
    },
  });
});

async function openFolder(files = URLAUB) {
  const user = userEvent.setup();
  const view = render(<App makeThumbnail={makeThumbnail} />);
  await user.upload(screen.getByLabelText("Bildordner"), files);
  return { user, ...view };
}

function rows() {
  return within(screen.getByRole("list", { name: "Bilder" })).getAllByRole("button");
}

/** The file paths in the rows (without the format text of a row without thumbnail). */
function names() {
  return rows().map((row) => within(row).getByText(/\./).textContent);
}

/** The thumbnail of a row. It has an empty alt text, so its role is "presentation". */
function thumbnailOf(fileName: string) {
  const row = screen.getByRole("button", { name: new RegExp(fileName) });
  return within(row).getByRole("presentation");
}

function selectedRow() {
  return rows().find((row) => row.getAttribute("aria-current") === "true");
}

describe("App", () => {
  it("asks for a folder and explains that nothing is uploaded", () => {
    render(<App makeThumbnail={makeThumbnail} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Bilder eines Ordners ansehen" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ordner wählen …" })).toBeInTheDocument();
    expect(screen.getByText(/Die App lädt nichts hoch/)).toBeInTheDocument();
  });

  it("lists the images of the picked folder and shows the first one", async () => {
    await openFolder();
    expect(
      screen.getByText(
        "„Urlaub“: 4 Bilder. Die Pfeiltasten, Pos1 und Ende wählen ein anderes Bild.",
      ),
    ).toBeInTheDocument();
    expect(names()).toEqual(["hochformat.jpg", "iphone.heic", "kaputt.jpg", "strand.jpg"]);
    expect(selectedRow()).toHaveTextContent("hochformat.jpg");

    const preview = screen.getByRole("region", { name: "Vorschau" });
    expect(within(preview).getByRole("img", { name: "hochformat.jpg" })).toHaveAttribute(
      "src",
      "blob:hochformat.jpg",
    );
    expect(preview).toHaveTextContent("hochformat.jpg · 1 KB · 14.12.2022 · Bild 1 von 4");
  });

  it("shows the thumbnails, turned upright, and an icon if there is none", async () => {
    await openFolder();
    await vi.waitFor(() => {
      expect(thumbnailOf("strand.jpg")).toHaveAttribute("src", "thumb:strand.jpg");
    });
    expect(thumbnailOf("strand.jpg")).not.toHaveClass("rotate-90");
    expect(thumbnailOf("hochformat.jpg")).toHaveClass("rotate-90");
    // The broken file shows its format instead of a thumbnail.
    await vi.waitFor(() => {
      expect(rows()[2]).toHaveTextContent("JPGkaputt.jpg");
    });
  });

  it("selects images with a click and with the arrow keys, Home and End", async () => {
    const { user } = await openFolder();
    await user.click(screen.getByText("kaputt.jpg"));
    expect(selectedRow()).toHaveTextContent("kaputt.jpg");

    await user.keyboard("{ArrowDown}");
    expect(selectedRow()).toHaveTextContent("strand.jpg");
    expect(selectedRow()).toHaveFocus();
    expect(screen.getByRole("region", { name: "Vorschau" })).toHaveTextContent(
      "3,6 MB · 14.12.2022 · Bild 4 von 4",
    );
    await user.keyboard("{ArrowRight}");
    expect(selectedRow()).toHaveTextContent("strand.jpg");

    await user.keyboard("{Home}");
    expect(selectedRow()).toHaveTextContent("hochformat.jpg");
    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(selectedRow()).toHaveTextContent("hochformat.jpg");
    await user.keyboard("{End}{ArrowUp}");
    expect(selectedRow()).toHaveTextContent("kaputt.jpg");

    // Keys with Ctrl, Alt or Cmd and other keys do nothing.
    await user.keyboard("{Control>}{ArrowDown}{/Control}{Enter}");
    expect(selectedRow()).toHaveTextContent("kaputt.jpg");
  });

  it("says when the browser cannot show an image", async () => {
    const { user } = await openFolder();
    await user.click(screen.getByText("iphone.heic"));
    const preview = () => screen.getByRole("region", { name: "Vorschau" });
    expect(preview()).toHaveTextContent("Der Browser kann das Format HEIC nicht anzeigen.");

    await user.click(screen.getByText("kaputt.jpg"));
    // The browser events of the image. userEvent has no load or error event.
    fireEvent.error(within(preview()).getByRole("img", { name: "kaputt.jpg" }));
    expect(preview()).toHaveTextContent("Vielleicht ist die Datei beschädigt");
  });

  it("says that the image loads, and shows its size in pixels after it loaded", async () => {
    await openFolder();
    const preview = screen.getByRole("region", { name: "Vorschau" });
    expect(within(preview).getByText("Lädt …")).toBeInTheDocument();

    const image = within(preview).getByRole("img");
    Object.defineProperty(image, "naturalWidth", { value: 3456 });
    Object.defineProperty(image, "naturalHeight", { value: 4608 });
    // The browser event of the image. userEvent has no load event.
    fireEvent.load(image);
    expect(screen.getByText(/3456 × 4608 Pixel/)).toBeInTheDocument();
    expect(within(preview).queryByText("Lädt …")).not.toBeInTheDocument();
  });

  it("opens another folder and frees the URLs of the old one", async () => {
    const { user } = await openFolder();
    await vi.waitFor(() => {
      expect(
        within(screen.getByRole("list", { name: "Bilder" })).getAllByRole("presentation"),
      ).toHaveLength(2);
    });

    await user.upload(screen.getByLabelText("Bildordner"), [
      fileAt("Garten/rose.png"),
      fileAt("Garten/tulpe.png"),
    ]);
    expect(names()).toEqual(["rose.png", "tulpe.png"]);
    expect(screen.getByText(/„Garten“: 2 Bilder/)).toBeInTheDocument();
    expect(revoked).toEqual(
      expect.arrayContaining([
        "blob:strand.jpg",
        "blob:iphone.heic",
        "thumb:strand.jpg",
        "thumb:hochformat.jpg",
      ]),
    );
  });

  it("says when the folder has no images", async () => {
    await openFolder([fileAt("Dokumente/brief.pdf")]);
    expect(screen.getByText("Im Ordner „Dokumente“ sind keine Bilder.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Bilder" })).not.toBeInTheDocument();

    // An empty folder gives no files and thus no folder name. userEvent cannot upload no files.
    fireEvent.change(screen.getByLabelText("Bildordner"), { target: { files: [] } });
    expect(screen.getByText("Im Ordner sind keine Bilder.")).toBeInTheDocument();
  });

  it("names a folder with one image in the singular", async () => {
    await openFolder([fileAt("Einzeln/bild.gif")]);
    expect(screen.getByText(/„Einzeln“: 1 Bild\./)).toBeInTheDocument();
  });
});
