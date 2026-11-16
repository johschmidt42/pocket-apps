import { FileButton } from "@pocket-apps/core/file-button";
import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { ImageUp, Trash2, UserRound } from "lucide-react";

export type PhotoCardProps = {
  /** The photo as a data URL, or `null`. */
  photoUrl: string | null;
  hasPhoto: boolean;
  /** True while the app prepares or saves a photo. */
  busy: boolean;
  error: string | null;
  onChoose: (file: File) => void;
  onRemove: () => void;
};

/** The photo of the active variant: a small preview, a button to choose one, and to remove it. */
export function PhotoCard({ photoUrl, hasPhoto, busy, error, onChoose, onRemove }: PhotoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Foto</h2>
        </CardTitle>
        <CardDescription>
          Gilt nur für diese Variante. Die App schneidet das Bild mittig auf 4 : 5 zu und speichert
          eine Kopie im Datenordner.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Foto dieser Variante"
              className="aspect-[4/5] w-20 rounded-md object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex aspect-[4/5] w-20 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <UserRound aria-hidden="true" className="size-8" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <FileButton
              variant="outline"
              accept="image/*"
              inputLabel="Foto-Datei"
              disabled={busy}
              onFile={onChoose}
            >
              <ImageUp data-icon="inline-start" />
              {busy ? "Speichert …" : hasPhoto ? "Anderes Foto …" : "Foto wählen …"}
            </FileButton>
            {hasPhoto && (
              <Button variant="ghost" disabled={busy} onClick={onRemove}>
                <Trash2 data-icon="inline-start" />
                Foto entfernen
              </Button>
            )}
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
