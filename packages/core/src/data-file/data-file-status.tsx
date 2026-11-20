import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import { ArrowLeftRight } from "lucide-react";
import type { StorageKind } from "./folder.ts";
import { RawDataButton } from "./raw-data-button.tsx";
import type { RawFile } from "./raw-data-dialog.tsx";
import type { SaveStatus } from "./reducer.ts";
import { STORAGE_TEXTS } from "./storage-kinds.ts";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "Gespeichert",
  pending: "Speichert …",
  saving: "Speichert …",
  failed: "Speichern fehlgeschlagen",
  conflict: "Nicht gespeichert: Konflikt",
};

export type DataFileStatusProps = {
  folderName: string;
  /** The kind of the storage. The status line shows its icon. */
  folderKind: StorageKind;
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
 * The line under the header: where the data is (with the icon of the storage), whether it is
 * saved, and what to do on a problem. A click on the name shows the raw data of the file. On a
 * phone, the line shows only the name of the storage, not the file.
 */
export function DataFileStatus(props: DataFileStatusProps) {
  const place = `${props.folderName} / ${props.fileName}`;
  const storage = STORAGE_TEXTS[props.folderKind];
  const Icon = storage.icon;
  return (
    <div className="border-b">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* On a phone, the status is a second line under the name. */}
          <p className="flex min-w-0 flex-col text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-x-1.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span title={storage.title} className="flex">
                <Icon role="img" aria-label={storage.title} className="size-4 shrink-0" />
              </span>
              <RawDataButton
                size="sm"
                variant="link"
                className="h-6 min-w-0 px-0 font-medium text-foreground sm:h-8"
                label={`${place}: Rohdaten ansehen`}
                hint="Rohdaten ansehen"
                fileName={props.fileName}
                folderName={props.folderName}
                unsaved={props.save !== "saved"}
                readRaw={props.readRaw}
              >
                <span className="truncate">
                  {props.folderName}
                  <span className="hidden sm:inline"> / {props.fileName}</span>
                </span>
              </RawDataButton>
            </span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span role="status" className="pl-5.5 text-xs sm:pl-0 sm:text-sm">
              {STATUS_TEXT[props.save]}
            </span>
          </p>
          {/* The button works only when all changes are saved. Then the change cannot lose data. */}
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            aria-label="Speicherort wechseln"
            disabled={props.save !== "saved"}
            onClick={props.onChangeFolder}
          >
            <ArrowLeftRight data-icon="inline-start" />
            <span className="sm:hidden">Wechseln</span>
            <span className="hidden sm:inline">Speicherort wechseln</span>
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
