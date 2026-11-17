import { cn } from "@pocket-apps/ui/lib/utils";
import { ImageOff } from "lucide-react";
import type { Rotation } from "./exif-thumbnail.ts";
import type { ImageEntry } from "./image-folder.ts";
import type { Thumbnail } from "./thumbnail.ts";

/** The state of the thumbnail of one row. */
export type ThumbnailState =
  | { kind: "loading" }
  | { kind: "ready"; thumbnail: Thumbnail }
  /** The browser cannot decode the file. */
  | { kind: "failed" };

const ROTATION_CLASS: Record<Rotation, string> = {
  0: "",
  90: "rotate-90",
  180: "rotate-180",
  270: "-rotate-90",
};

type ThumbnailBoxProps = { image: ImageEntry; state: ThumbnailState };

/** The square thumbnail at the left of a row. Without a thumbnail, it shows the format. */
export function ThumbnailBox({ image, state }: ThumbnailBoxProps) {
  return (
    <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
      {image.kind === "other" ? (
        <FormatLabel format={image.format} />
      ) : (
        content(state, image.format)
      )}
    </span>
  );
}

function content(state: ThumbnailState, format: string) {
  switch (state.kind) {
    case "loading":
      return null;
    case "ready":
      return (
        <img
          src={state.thumbnail.url}
          alt=""
          className={cn("size-full object-cover", ROTATION_CLASS[state.thumbnail.rotation])}
        />
      );
    case "failed":
      return <FormatLabel format={format} />;
  }
}

function FormatLabel({ format }: { format: string }) {
  return (
    <span className="flex flex-col items-center gap-0.5 text-[10px] font-medium">
      <ImageOff className="size-5" aria-hidden />
      {format}
    </span>
  );
}
