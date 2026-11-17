import { cn } from "@pocket-apps/ui/lib/utils";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ImageEntry } from "./image-folder.ts";
import { stepIndex } from "./step-index.ts";
import { releaseThumbnail, type MakeThumbnail, type Thumbnail } from "./thumbnail.ts";
import { ThumbnailBox, type ThumbnailState } from "./thumbnail-box.tsx";
import { createThumbnailQueue } from "./thumbnail-queue.ts";

/**
 * How many thumbnails load at the same time. A file in Google Drive (mode "stream files")
 * downloads first: about 1.3 s per file, but several downloads run in parallel.
 */
const CONCURRENCY = 6;

/** Rows within this distance of the visible part of the list already load their thumbnail. */
const PRELOAD_MARGIN = "200px 0px";

const LOADING: ThumbnailState = { kind: "loading" };

type ImageListProps = {
  images: ImageEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  makeThumbnail: MakeThumbnail;
};

/**
 * The list of the images with their thumbnails. Only the rows on the screen load a thumbnail.
 * The arrow keys, Home and End select another image, wherever the focus is on the page.
 */
export function ImageList({ images, selectedIndex, onSelect, makeThumbnail }: ImageListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, ThumbnailState>>(
    () => new Map(),
  );

  // The visibility of the rows (IntersectionObserver) and the loading of the files.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const files = new Map(images.map((image) => [image.path, image.file]));
    const queue = createThumbnailQueue<Thumbnail>({
      concurrency: CONCURRENCY,
      load: (path) => {
        const file = files.get(path);
        return file ? makeThumbnail(file) : Promise.reject(new Error(`No file: ${path}`));
      },
      onResult: (path, thumbnail) => {
        const state: ThumbnailState = thumbnail ? { kind: "ready", thumbnail } : { kind: "failed" };
        setThumbnails((previous) => new Map(previous).set(path, state));
      },
      dispose: releaseThumbnail,
    });
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          const path = change.target.getAttribute("data-thumbnail");
          if (path !== null) queue.setVisible(path, change.isIntersecting);
        }
      },
      { root: list, rootMargin: PRELOAD_MARGIN },
    );
    for (const row of list.querySelectorAll("[data-thumbnail]")) observer.observe(row);
    return () => {
      observer.disconnect();
      queue.stop();
    };
  }, [images, makeThumbnail]);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    // Radix components (for example the theme switch) handle their own arrow keys.
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = stepIndex(event.key, selectedIndex, images.length);
    if (index === null) return;
    event.preventDefault();
    onSelect(index);
    // The focus follows the selection. Then the list scrolls to it, and screen readers read it.
    // Each row has exactly one button.
    listRef.current?.querySelectorAll("button")[index]?.focus();
  });

  // The keys work on the whole page (a browser event).
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      onKeyDown(event);
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);

  return (
    <ul
      ref={listRef}
      aria-label="Bilder"
      className="min-h-0 flex-1 overflow-y-auto rounded-lg border md:w-80 md:flex-none"
    >
      {images.map((image, index) => {
        const selected = index === selectedIndex;
        return (
          <li
            key={image.path}
            data-thumbnail={image.kind === "browser" ? image.path : undefined}
            className="border-b last:border-b-0"
          >
            <button
              type="button"
              tabIndex={selected ? 0 : -1}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3 p-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                selected &&
                  "bg-accent font-medium text-accent-foreground ring-2 ring-primary ring-inset hover:bg-accent",
              )}
              onClick={() => {
                onSelect(index);
              }}
            >
              <ThumbnailBox image={image} state={thumbnails.get(image.path) ?? LOADING} />
              <span className="min-w-0 flex-1 truncate text-sm">{image.path}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
