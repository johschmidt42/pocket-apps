import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { FilePlus, FolderOpen } from "lucide-react";
import type { FileActions } from "./actions.ts";

/** Start screen: create a new data file or open one. */
export function DataFileStart({ file }: { file: FileActions }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-12">
      <Card>
        <CardHeader>
          <CardTitle>Deine Daten</CardTitle>
          <CardDescription>
            Deine Daten liegen in einer eigenen Datei. Lege eine neue Datei an oder öffne eine
            vorhandene Datei.
          </CardDescription>
        </CardHeader>
        {!file.directSave && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Dein Browser kann nicht direkt in die Datei speichern. Beim Speichern lädt er die
              Datei herunter. Tipp: Stelle im Browser ein, dass er bei jedem Download nach dem
              Speicherort fragt. Dann kannst du die alte Datei überschreiben.
            </p>
          </CardContent>
        )}
        <CardFooter className="gap-2">
          <Button onClick={() => void file.createNew()}>
            <FilePlus data-icon="inline-start" />
            Neue Datei
          </Button>
          <Button variant="outline" onClick={() => void file.open()}>
            <FolderOpen data-icon="inline-start" />
            Datei öffnen
          </Button>
        </CardFooter>
      </Card>
      {file.error && (
        <Alert variant="destructive">
          <AlertDescription>{file.error}</AlertDescription>
        </Alert>
      )}
    </main>
  );
}
