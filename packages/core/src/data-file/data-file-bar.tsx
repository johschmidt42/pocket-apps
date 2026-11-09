import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import { FilePlus, FolderOpen, Save } from "lucide-react";
import type { LoadedFileActions } from "./actions.ts";

const DISCARD_QUESTION = "Es gibt ungespeicherte Änderungen. Möchtest du sie verwerfen?";

function statusText(dirty: boolean, autosaving: boolean): string {
  if (!dirty) return "Gespeichert";
  return autosaving ? "Speichert …" : "Nicht gespeichert";
}

/** File bar above the app: file name, save status and file actions. */
export function DataFileBar({ file }: { file: LoadedFileActions }) {
  function confirmDiscard(): boolean {
    return !file.dirty || window.confirm(DISCARD_QUESTION);
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 p-2">
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm font-medium">{file.fileName}</p>
          <p role="status" className="text-xs text-muted-foreground">
            {statusText(file.dirty, file.autosaving)}
          </p>
        </div>
        {(!file.autosaving || file.dirty) && (
          <Button size="sm" onClick={() => void file.save()}>
            <Save data-icon="inline-start" />
            Speichern
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (confirmDiscard()) void file.open();
          }}
        >
          <FolderOpen data-icon="inline-start" />
          Öffnen
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (confirmDiscard()) void file.createNew();
          }}
        >
          <FilePlus data-icon="inline-start" />
          Neu
        </Button>
      </div>
      {file.pendingMigration && (
        <div className="mx-auto max-w-3xl p-2">
          <Alert>
            <AlertDescription>
              Die App hat deine Daten in ein neues Format umgewandelt. Eine Kopie der alten Datei
              liegt in deinem Download-Ordner. Klicke auf „Speichern“, um die Datei im neuen Format
              zu speichern.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {file.error && (
        <div className="mx-auto max-w-3xl p-2">
          <Alert variant="destructive">
            <AlertDescription>{file.error}</AlertDescription>
          </Alert>
        </div>
      )}
    </header>
  );
}
