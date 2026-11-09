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
import { FolderOpen, KeyRound } from "lucide-react";
import type { ReactNode } from "react";
import type { DataFolder, FolderHost } from "./folder.ts";
import { LoadingStatus } from "./loading-status.tsx";
import { useDataFolder } from "./use-data-folder.ts";

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-12">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{title}</h2>
          </CardTitle>
        </CardHeader>
        {children}
      </Card>
    </main>
  );
}

/**
 * Shows the app only when the data folder is ready.
 * Else it shows what the person must do: use Chrome or Edge, pick a folder, or allow access.
 */
export function DataFolderGate({
  host,
  children,
}: {
  host: FolderHost;
  children: (folder: DataFolder) => ReactNode;
}) {
  const { state, error, pick, grant } = useDataFolder(host);
  const errorAlert = error && (
    <CardContent>
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </CardContent>
  );
  const pickButton = (label: string, primary: boolean) => (
    <Button variant={primary ? "default" : "outline"} onClick={() => void pick()}>
      <FolderOpen data-icon="inline-start" />
      {label}
    </Button>
  );

  switch (state.status) {
    case "checking":
      return <LoadingStatus />;
    case "unsupported":
      return (
        <Screen title="Bitte Chrome oder Edge verwenden">
          <CardContent>
            <CardDescription>
              Pocket Apps speichern deine Daten in einem Ordner auf deinem Rechner. Das können nur
              Chrome und Edge am Computer. Öffne diese Seite bitte in Chrome oder Edge.
            </CardDescription>
          </CardContent>
        </Screen>
      );
    case "missing":
      return (
        <Screen title="Datenordner wählen">
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Deine Daten liegen in einem Ordner auf deinem Rechner, zum Beispiel „Pocket Apps
              Daten“. Lege ihn gern in deinem Google-Drive- oder OneDrive-Ordner an. Dann hast du
              automatisch ein Backup.
            </p>
            <p>Chrome fragt danach, ob die Seite den Ordner bearbeiten darf. Erlaube es.</p>
          </CardContent>
          {errorAlert}
          <CardFooter>{pickButton("Ordner wählen …", true)}</CardFooter>
        </Screen>
      );
    case "locked": {
      const { folder } = state;
      return (
        <Screen title="Zugriff auf deinen Datenordner">
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Chrome fragt, ob diese Seite den Ordner „{folder.name}“ wieder bearbeiten darf. Wähle
              „Bei jedem Besuch erlauben“. Dann fragt Chrome nicht wieder.
            </p>
            {state.denied && (
              <p>Chrome hat den Zugriff abgelehnt. Erlaube ihn oder wähle einen anderen Ordner.</p>
            )}
          </CardContent>
          {errorAlert}
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={() => void grant(folder)}>
              <KeyRound data-icon="inline-start" />
              Zugriff erlauben
            </Button>
            {pickButton("Anderen Ordner wählen …", false)}
          </CardFooter>
        </Screen>
      );
    }
    case "ready":
      return children(state.folder);
  }
}
