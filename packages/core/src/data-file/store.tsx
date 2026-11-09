import type { AppInfo } from "@pocket-apps/vite-config";
import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import { createContext, use, useEffect, useReducer, useState, type ReactNode } from "react";
import { AppHeader } from "../app-shell/app-header.tsx";
import { browserFolderHost } from "./browser-folder-host.ts";
import { DataFileStatus } from "./data-file-status.tsx";
import { DataFolderGate } from "./data-folder-gate.tsx";
import { serializeEnvelope } from "./envelope.ts";
import { DataFileError } from "./errors.ts";
import type { DataFolder, FolderHost } from "./folder.ts";
import { loadData } from "./migrate.ts";
import { dataFileReducer, type DataFileAction, type ReadyState } from "./reducer.ts";
import { currentVersion, type DataSchema } from "./schema.ts";

/** What the app components get from `useDataFile()`. */
export type DataFileApi<T> = {
  data: T;
  update: (updater: (data: T) => T) => void;
};

export type DataFileStoreOptions = {
  /** The app info. Use `__POCKET_APP__`. */
  app: AppInfo;
  /** Wait time before an automatic save. Default: 500 ms. */
  autosaveDelayMs?: number;
  /** Wait time before the next try after a failed save. Default: 5000 ms. */
  retryDelayMs?: number;
};

export type DataFileProviderProps = {
  children: ReactNode;
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
};

function errorMessage(error: unknown): string {
  if (error instanceof DataFileError) return error.message;
  return `Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Creates the data file store for one app.
 * The data lives in `<schema.app>.json` in the data folder that the person picked.
 * Call it once per app, at module level, with the app's schema.
 */
export function createDataFileStore<T>(schema: DataSchema<T>, options: DataFileStoreOptions) {
  const Context = createContext<DataFileApi<T> | null>(null);
  const fileName = `${schema.app}.json`;
  const backupName = (version: number) => `${schema.app}.backup-v${String(version)}.json`;
  const schemaVersion = currentVersion(schema);
  const autosaveDelayMs = options.autosaveDelayMs ?? 500;
  const retryDelayMs = options.retryDelayMs ?? 5000;

  function serialize(data: T): string {
    return serializeEnvelope({
      app: schema.app,
      schemaVersion,
      appVersion: options.app.version,
      data,
    });
  }

  async function loadFile(folder: DataFolder): Promise<DataFileAction<T>> {
    try {
      const file = await folder.read(fileName);
      if (!file) {
        const data = schema.initial();
        return { type: "loaded", data, saved: data, lastModified: null };
      }
      const result = loadData(file.text, schema);
      if (result.migratedFrom === null) {
        return {
          type: "loaded",
          data: result.data,
          saved: result.data,
          lastModified: file.lastModified,
        };
      }
      // Keep the old file before the app writes the new shape.
      await folder.write(backupName(result.migratedFrom), file.text);
      return { type: "loaded", data: result.data, saved: null, lastModified: file.lastModified };
    } catch (error) {
      return { type: "broken", message: errorMessage(error) };
    }
  }

  async function persist(
    folder: DataFolder,
    state: ReadyState<T>,
    dispatch: (action: DataFileAction<T>) => void,
  ): Promise<void> {
    dispatch({ type: "saving" });
    try {
      // Another device can have changed the file (for example through Google Drive).
      if ((await folder.lastModified(fileName)) !== state.lastModified) {
        dispatch({ type: "conflict" });
        return;
      }
      const lastModified = await folder.write(fileName, serialize(state.data));
      dispatch({ type: "saved", data: state.data, lastModified });
    } catch (error) {
      dispatch({ type: "failed", message: errorMessage(error) });
    }
  }

  function FileView({ folder, children }: { folder: DataFolder; children: ReactNode }) {
    const [state, dispatch] = useReducer(dataFileReducer<T>, { status: "loading" });
    const [loadCount, setLoadCount] = useState(0);

    // The file lives in the data folder (an external system).
    useEffect(() => {
      let active = true;
      void loadFile(folder).then((action) => {
        if (active) dispatch(action);
      });
      return () => {
        active = false;
      };
    }, [folder, loadCount]);

    // Automatic save, a moment after the last change.
    useEffect(() => {
      if (state.status !== "ready" || state.save !== "pending") return;
      const timer = setTimeout(() => {
        void persist(folder, state, dispatch);
      }, autosaveDelayMs);
      return () => {
        clearTimeout(timer);
      };
    }, [folder, state]);

    // After a failed save, try again a moment later.
    const failed = state.status === "ready" && state.save === "failed";
    useEffect(() => {
      if (!failed) return;
      const timer = setTimeout(() => {
        dispatch({ type: "retry" });
      }, retryDelayMs);
      return () => {
        clearTimeout(timer);
      };
    }, [failed]);

    // Warn before the person closes the tab with unsaved changes.
    const unsaved = state.status === "ready" && state.save !== "saved";
    useEffect(() => {
      if (!unsaved) return;
      const onBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
      };
      window.addEventListener("beforeunload", onBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", onBeforeUnload);
      };
    }, [unsaved]);

    function reload() {
      dispatch({ type: "loading" });
      setLoadCount((count) => count + 1);
    }

    async function keepMine() {
      try {
        dispatch({ type: "overwrite", lastModified: await folder.lastModified(fileName) });
      } catch (error) {
        dispatch({ type: "failed", message: errorMessage(error) });
      }
    }

    if (state.status === "loading") {
      return (
        <p role="status" className="p-4 text-sm text-muted-foreground">
          Lädt …
        </p>
      );
    }
    if (state.status === "broken") {
      return (
        <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-12">
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                Die Datei „{fileName}“ im Ordner „{folder.name}“ lässt sich nicht öffnen.{" "}
                {state.message}
              </span>
              <Button size="sm" variant="outline" onClick={reload}>
                Erneut laden
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      );
    }

    const api: DataFileApi<T> = {
      data: state.data,
      update: (updater) => {
        dispatch({ type: "updated", updater });
      },
    };
    return (
      <Context value={api}>
        <DataFileStatus
          folderName={folder.name}
          fileName={fileName}
          save={state.save}
          error={state.error}
          onRetry={() => {
            dispatch({ type: "retry" });
          }}
          onReload={reload}
          onKeepMine={() => void keepMine()}
        />
        {children}
      </Context>
    );
  }

  function DataFileProvider({ children, folderHost = browserFolderHost }: DataFileProviderProps) {
    return (
      <>
        <AppHeader app={options.app} />
        <DataFolderGate host={folderHost}>
          {(folder) => <FileView folder={folder}>{children}</FileView>}
        </DataFolderGate>
      </>
    );
  }

  /** Returns the data and the update function. Use it only inside `DataFileProvider`. */
  function useDataFile(): DataFileApi<T> {
    const api = use(Context);
    if (!api) throw new Error("useDataFile() must be used inside <DataFileProvider>.");
    return api;
  }

  return { DataFileProvider, useDataFile };
}
