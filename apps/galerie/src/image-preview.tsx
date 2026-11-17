import { cn } from "@pocket-apps/ui/lib/utils";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import { formatDate, formatFileSize } from "./format.ts";
import type { ImageEntry } from "./image-folder.ts";

/** The state of the large image. A file in Google Drive can load for a second or more. */
type LoadState =
  { kind: "loading" } | { kind: "loaded"; width: number; height: number } | { kind: "failed" };

type ImagePreviewProps = {
  image: ImageEntry;
  /** The number of the image in the list (1 for the first) and the number of images. */
  position: number;
  count: number;
};

/**
 * The selected image, as large as the space allows, with its facts below.
 * The parent gives it a new `key` for each image. Then the state starts at "loading".
 */
export function ImagePreview({ image, position, count }: ImagePreviewProps) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });

  const facts = [
    image.path,
    load.kind === "loaded" ? `${String(load.width)} × ${String(load.height)} Pixel` : null,
    formatFileSize(image.file.size),
    formatDate(image.file.lastModified),
    `Bild ${String(position)} von ${String(count)}`,
  ].filter((fact) => fact !== null);

  return (
    <section aria-label="Vorschau" className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative min-h-0 flex-1 rounded-lg bg-muted/40">
        {image.kind === "other" ? (
          <Notice text={`Der Browser kann das Format ${image.format} nicht anzeigen.`} />
        ) : load.kind === "failed" ? (
          <Notice text="Der Browser kann dieses Bild nicht anzeigen. Vielleicht ist die Datei beschädigt, oder er kennt das Format nicht." />
        ) : (
          <>
            {load.kind === "loading" && (
              <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Lädt …
              </p>
            )}
            <img
              src={image.url}
              alt={image.name}
              className={cn(
                "absolute inset-0 size-full object-contain",
                load.kind === "loading" && "invisible",
              )}
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                setLoad({ kind: "loaded", width: naturalWidth, height: naturalHeight });
              }}
              onError={() => {
                setLoad({ kind: "failed" });
              }}
            />
          </>
        )}
      </div>
      <p className="text-sm wrap-anywhere text-muted-foreground">{facts.join(" · ")}</p>
    </section>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
      <ImageOff className="size-8" aria-hidden />
      <p>{text}</p>
    </div>
  );
}
