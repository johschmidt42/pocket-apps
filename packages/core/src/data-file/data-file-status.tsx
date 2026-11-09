import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import type { SaveStatus } from "./reducer.ts";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "Gespeichert",
  pending: "Speichert …",
  saving: "Speichert …",
  failed: "Speichern fehlgeschlagen",
  conflict: "Nicht gespeichert: Konflikt",
};

export type DataFileStatusProps = {
  folderName: string;
  fileName: string;
  save: SaveStatus;
  error: string | null;
  onRetry: () => void;
  onReload: () => void;
  onKeepMine: () => void;
};

/** The line under the header: where the data is, whether it is saved, and what to do on a problem. */
export function DataFileStatus(props: DataFileStatusProps) {
  return (
    <div className="border-b">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 p-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {props.folderName} / {props.fileName}
          </span>
          {" · "}
          <span role="status">{STATUS_TEXT[props.save]}</span>
        </p>
        {props.save === "failed" && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>Speichern fehlgeschlagen: {props.error}</span>
              <span>Die App versucht es gleich noch einmal.</span>
              <Button size="sm" variant="outline" onClick={props.onRetry}>
                Jetzt erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {props.save === "conflict" && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                Jemand hat die Datei woanders geändert, zum Beispiel auf einem anderen Rechner. Die
                App hat deine Änderungen hier noch nicht gespeichert.
              </span>
              <span className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={props.onReload}>
                  Neu laden (meine Änderungen verwerfen)
                </Button>
                <Button size="sm" onClick={props.onKeepMine}>
                  Meine Version speichern
                </Button>
              </span>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
