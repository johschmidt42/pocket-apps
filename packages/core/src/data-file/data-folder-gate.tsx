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
import { Fragment, type ReactNode } from "react";
import type { DataFolder, FolderHost } from "./folder.ts";
import { LoadingStatus } from "./loading-status.tsx";
import { useDataFolder } from "./use-data-folder.ts";

const TITLE_ID = "data-folder-title";

/**
 * A card with a task for the user.
 * If the app needs the folder, the card fills the screen (`<main>`).
 * If the folder is optional, the card is a section above the app.
 */
function TaskCard({
  title,
  optional,
  children,
}: {
  title: string;
  optional: boolean;
  children: ReactNode;
}) {
  const card = (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 id={TITLE_ID}>{title}</h2>
        </CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
  return optional ? (
    <section aria-labelledby={TITLE_ID} className="mx-auto max-w-3xl px-4 pt-4">
      {card}
    </section>
  ) : (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-12">{card}</main>
  );
}

export type DataFolderGateProps = {
  host: FolderHost;
  /**
   * False (default): the gate shows the app only when the folder is ready.
   * True: the gate always shows the app. Without a folder, it shows the task above the app and gives `null`.
   */
  optional?: boolean;
  /** Renders the app. `changeFolder` lets the person pick another folder. */
  children: (folder: DataFolder | null, changeFolder: () => void) => ReactNode;
};

/**
 * Shows what the person must do for the data folder: use Chrome or Edge, pick a folder, or allow access.
 * Shows the app when the folder is ready (or always, if the folder is optional).
 */
export function DataFolderGate({ host, optional = false, children }: DataFolderGateProps) {
  const { state, error, pickCount, pick, grant } = useDataFolder(host);
  const changeFolder = () => void pick();
  const errorAlert = error && (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
  const pickButton = (label: string, primary: boolean) => (
    <Button variant={primary ? "default" : "outline"} onClick={changeFolder}>
      <FolderOpen data-icon="inline-start" />
      {label}
    </Button>
  );
  const withoutFolder = (task: ReactNode) => (
    <>
      {task}
      {optional && children(null, changeFolder)}
    </>
  );

  switch (state.status) {
    case "checking":
      return <LoadingStatus />;
    case "unsupported":
      return optional ? (
        withoutFolder(
          // A static note, not an alert: screen readers must not announce it at each visit.
          <aside
            aria-label="Hinweis"
            className="mx-auto max-w-3xl px-4 pt-4 text-sm text-muted-foreground"
          >
            <p>Apps mit Daten funktionieren nur in Chrome und Edge am Computer.</p>
          </aside>,
        )
      ) : (
        <TaskCard title="Bitte Chrome oder Edge verwenden" optional={false}>
          <CardContent>
            <CardDescription>
              Pocket Apps speichern deine Daten in einem Ordner auf deinem Rechner. Das können nur
              Chrome und Edge am Computer. Öffne diese Seite bitte in Chrome oder Edge.
            </CardDescription>
          </CardContent>
        </TaskCard>
      );
    case "missing":
      return withoutFolder(
        <TaskCard title="Datenordner wählen" optional={optional}>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Deine Daten liegen in einem Ordner auf deinem Rechner, zum Beispiel „Pocket Apps
              Daten“. Lege ihn gern in deinem Google-Drive- oder OneDrive-Ordner an. Dann hast du
              automatisch ein Backup.
            </p>
            <p>Chrome fragt danach, ob die Seite den Ordner bearbeiten darf. Erlaube es.</p>
            {errorAlert}
          </CardContent>
          <CardFooter>{pickButton("Ordner wählen …", true)}</CardFooter>
        </TaskCard>,
      );
    case "locked": {
      const { folder } = state;
      return withoutFolder(
        <TaskCard title="Zugriff auf deinen Datenordner" optional={optional}>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Chrome fragt, ob diese Seite den Ordner „{folder.name}“ wieder bearbeiten darf. Wähle
              „Bei jedem Besuch erlauben“. Dann fragt Chrome nicht wieder.
            </p>
            {state.denied && (
              <p>Chrome hat den Zugriff abgelehnt. Erlaube ihn oder wähle einen anderen Ordner.</p>
            )}
            {errorAlert}
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={() => void grant(folder)}>
              <KeyRound data-icon="inline-start" />
              Zugriff erlauben
            </Button>
            {pickButton("Anderen Ordner wählen …", false)}
          </CardFooter>
        </TaskCard>,
      );
    }
    case "ready":
      return (
        <>
          {errorAlert && (
            <section aria-label="Datenordner" className="mx-auto max-w-3xl px-4 pt-4">
              {errorAlert}
            </section>
          )}
          {/* A new key for each picked folder: the app starts fresh and cannot save old data into it. */}
          <Fragment key={pickCount}>{children(state.folder, changeFolder)}</Fragment>
        </>
      );
  }
}
