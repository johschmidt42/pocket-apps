import { useState } from "react";
import type { ImageEntry } from "./image-folder.ts";
import { ImageList } from "./image-list.tsx";
import { ImagePreview } from "./image-preview.tsx";
import type { MakeThumbnail } from "./thumbnail.ts";

type ImageBrowserProps = {
  /** The images of the folder. At least one. They do not change: a new folder is a new browser. */
  images: ImageEntry[];
  makeThumbnail: MakeThumbnail;
};

/**
 * The list of the images and the preview of the selected image: next to each other on a wide
 * screen, one above the other on a narrow screen. The first image is selected at the start.
 */
export function ImageBrowser({ images, makeThumbnail }: ImageBrowserProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
      <ImageList
        images={images}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        makeThumbnail={makeThumbnail}
      />
      {selected && (
        <ImagePreview
          key={selected.path}
          image={selected}
          position={selectedIndex + 1}
          count={images.length}
        />
      )}
    </div>
  );
}
