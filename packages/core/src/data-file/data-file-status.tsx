import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import { RawDataButton } from "./raw-data-button.tsx";
import type { RawFile } from "./raw-data-dialog.tsx";
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
  onChangeFolder: () => void;
  /** Reads the data file for the raw view. */
  readRaw: () => Promise<RawFile>;
};

/**
 * The line under the header: where the data is, whether it is saved, and what to do on a problem.
 * A click on the file name shows the raw data of the file.
 */
export function DataFileStatus(props: DataFileStatusProps) {
  const place = `${props.folderName} / ${props.fileName}`;
  return (
    <div className="border-b">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 p-2">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <p>
            <RawDataButton
              size="xs"
              variant="link"
              className="h-auto px-0 font-medium text-foreground"
              label={`${place}: Rohdaten ansehen`}
              hint="Rohdaten ansehen"
              fileName={props.fileName}
              folderName={props.folderName}
              unsaved={props.save !== "saved"}
              readRaw={props.readRaw}
            >
              {place}
            </RawDataButton>
            {" · "}
            <span role="status">{STATUS_TEXT[props.save]}</span>
          </p>
          {/* The button works only when all changes are saved. Then the change cannot lose data. */}
          <Button
            size="xs"
            variant="link"
            disabled={props.save !== "saved"}
            onClick={props.onChangeFolder}
          >
            Speicherort wechseln
          </Button>
        </div>
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
