import type { AppInfo } from "@pocket-apps/vite-config";
import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import { createContext, use, useEffect, useReducer, useState, type ReactNode } from "react";
import { AppHeader } from "../app-shell/app-header.tsx";
import { browserFolderHost } from "./browser-folder.ts";
import { DataFileStatus } from "./data-file-status.tsx";
import { DataFolderGate } from "./data-folder-gate.tsx";
import { LoadingStatus } from "./loading-status.tsx";
import { serializeEnvelope } from "./envelope.ts";
import { DataFileError } from "./errors.ts";
import type { DataFolder, FolderHost } from "./folder.ts";
import { loadData } from "./migrate.ts";
import { dataFileReducer, type DataFileAction, type ReadyState } from "./reducer.ts";
import { currentVersion, type DataSchema } from "./schema.ts";

/** What the app components get from `useDataFile()`. */
export type DataFileApi<T> = {
  data: T;
  /** Changes the data. Without a folder (only with `folderOptional`), it does nothing. */
  update: (updater: (data: T) => T) => void;
  /** False only with `folderOptional` before the person picked a folder with access. */
  hasFolder: boolean;
};

export type DataFileStoreOptions = {
  /** The app info. Use `__POCKET_APP__`. */
  app: AppInfo;
  /** Wait time before an automatic save. Default: 500 ms. */
  autosaveDelayMs?: number;
  /** Wait time before the next try after a failed save. Default: 5000 ms. */
  retryDelayMs?: number;
  /**
   * True: the app also works without a data folder, with `initial()` data and without saving.
   * Then a task card above the app asks for the folder. For the launcher. Default: false.
   */
  folderOptional?: boolean;
};

export type DataFileProviderProps = {
  children: ReactNode;
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
};

function errorMessage(error: unknown): string {
  if (error instanceof DataFileError) return error.message;
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Die App hat keinen Zugriff auf den Datenordner.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "Die App findet den Datenordner nicht. Vielleicht hat jemand ihn verschoben oder gelöscht.";
  }
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
  const schemaVersion = currentVersion(schema);
  const autosaveDelayMs = options.autosaveDelayMs ?? 500;
  const retryDelayMs = options.retryDelayMs ?? 5000;
  const folderOptional = options.folderOptional ?? false;
  // Without a folder, the data stays `initial()`. Nothing can change it.
  const withoutFolder: DataFileApi<T> = {
    data: schema.initial(),
    hasFolder: false,
    update: () => undefined,
  };

  function serialize(data: T): string {
    return serializeEnvelope({
      app: schema.app,
      schemaVersion,
      appVersion: options.app.version,
      data,
    });
  }

  /** `<app>.backup-v<N>.json`. If that file exists: `<app>.backup-v<N>-2.json`, and so on. */
  async function freeBackupName(folder: DataFolder, version: number): Promise<string> {
    const base = `${schema.app}.backup-v${String(version)}`;
    for (let count = 1; ; count += 1) {
      const name = count === 1 ? `${base}.json` : `${base}-${String(count)}.json`;
      if ((await folder.lastModified(name)) === null) return name;
    }
  }

  async function loadFile(folder: DataFolder): Promise<DataFileAction<T>> {
    try {
      const file = await folder.read(fileName);
      if (!file) {
        return { type: "loaded", data: schema.initial(), needsSave: false, lastModified: null };
      }
      const result = loadData(file.text, schema);
      if (result.migratedFrom !== null) {
        // Keep the old file before the app writes the new shape. Never overwrite an older backup.
        await folder.write(await freeBackupName(folder, result.migratedFrom), file.text);
      }
      return {
        type: "loaded",
        data: result.data,
        needsSave: result.migratedFrom !== null,
        lastModified: file.lastModified,
      };
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

  type FileViewProps = { folder: DataFolder; changeFolder: () => void; children: ReactNode };

  function FileView({ folder, changeFolder, children }: FileViewProps) {
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

    // After a click, ask for access again if the browser lost it. Then the next try can work.
    async function regainAccess() {
      try {
        if ((await folder.queryAccess()) !== "granted") await folder.requestAccess();
      } catch {
        // The next try shows the error.
      }
    }

    async function reload() {
      await regainAccess();
      dispatch({ type: "loading" });
      setLoadCount((count) => count + 1);
    }

    async function retry() {
      await regainAccess();
      dispatch({ type: "retry" });
    }

    async function keepMine() {
      try {
        dispatch({ type: "overwrite", lastModified: await folder.lastModified(fileName) });
      } catch (error) {
        dispatch({ type: "failed", message: errorMessage(error) });
      }
    }

    if (state.status === "loading") {
      return <LoadingStatus />;
    }
    if (state.status === "broken") {
      return (
        <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pt-12">
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                Die App kann die Datei „{fileName}“ im Ordner „{folder.name}“ nicht öffnen.{" "}
                {state.message}
              </span>
              <Button size="sm" variant="outline" onClick={() => void reload()}>
                Erneut laden
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      );
    }

    const api: DataFileApi<T> = {
      data: state.data,
      hasFolder: true,
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
          onRetry={() => void retry()}
          onReload={() => void reload()}
          onKeepMine={() => void keepMine()}
          onChangeFolder={changeFolder}
        />
        {children}
      </Context>
    );
  }

  function DataFileProvider({ children, folderHost = browserFolderHost }: DataFileProviderProps) {
    return (
      <>
        <AppHeader app={options.app} />
        <DataFolderGate host={folderHost} optional={folderOptional}>
          {(folder, changeFolder) =>
            folder ? (
              <FileView folder={folder} changeFolder={changeFolder}>
                {children}
              </FileView>
            ) : (
              <Context value={withoutFolder}>{children}</Context>
            )
          }
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
