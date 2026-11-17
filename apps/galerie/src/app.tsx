import { AppHeader } from "@pocket-apps/core/app-shell";
import { FolderButton } from "@pocket-apps/core/folder-button";
import { Card, CardContent, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { ImageBrowser } from "./image-browser.tsx";
import { readImageFolder, type ImageFolder } from "./image-folder.ts";
import { createThumbnail, type MakeThumbnail } from "./thumbnail.ts";

/** The picked folder. `id` changes with each pick: then the list starts fresh. */
type OpenFolder = { id: number; folder: ImageFolder };

export type AppProps = {
  /** Makes the thumbnails. Unit tests give a fake, because jsdom cannot decode images. */
  makeThumbnail?: MakeThumbnail;
};

export function App({ makeThumbnail = createThumbnail }: AppProps) {
  const [open, setOpen] = useState<OpenFolder | null>(null);

  const pickFolder = (files: File[]) => {
    if (open) for (const image of open.folder.images) URL.revokeObjectURL(image.url);
    // An object URL only points to the file. It reads nothing, so all URLs at once are cheap.
    const folder = readImageFolder(files, (file) => URL.createObjectURL(file));
    setOpen({ id: (open?.id ?? 0) + 1, folder });
  };

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader app={__POCKET_APP__} />
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {open === null ? (
          <Card className="mx-auto w-full max-w-md">
            <CardHeader>
              <CardTitle>
                <h2>Bilder eines Ordners ansehen</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4 text-sm">
              <p>
                Wähle einen Ordner auf deinem Computer. Die App zeigt alle Bilder darin und in
                seinen Unterordnern.
              </p>
              <FolderButton inputLabel="Bildordner" onFiles={pickFolder}>
                <FolderOpen data-icon="inline-start" />
                Ordner wählen …
              </FolderButton>
              <p className="text-muted-foreground">
                Der Browser fragt, ob du die Dateien „hochladen“ willst. Die App lädt nichts hoch:
                Sie zeigt die Bilder nur in diesem Tab. Nach dem Schließen weiß sie nichts mehr
                davon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <FolderButton variant="outline" inputLabel="Bildordner" onFiles={pickFolder}>
                <FolderOpen data-icon="inline-start" />
                Anderer Ordner …
              </FolderButton>
              <p className="text-sm text-muted-foreground">{folderSummary(open.folder)}</p>
            </div>
            {open.folder.images.length > 0 && (
              <ImageBrowser
                key={open.id}
                images={open.folder.images}
                makeThumbnail={makeThumbnail}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/** For example "„Urlaub“: 182 Bilder. Die Pfeiltasten, Pos1 und Ende wählen ein anderes Bild." */
function folderSummary({ name, images }: ImageFolder): string {
  // A folder without files gives no name.
  if (images.length === 0) {
    return name === "" ? "Im Ordner sind keine Bilder." : `Im Ordner „${name}“ sind keine Bilder.`;
  }
  const count = images.length === 1 ? "1 Bild" : `${String(images.length)} Bilder`;
  return `„${name}“: ${count}. Die Pfeiltasten, Pos1 und Ende wählen ein anderes Bild.`;
}
