import { createContext, use, useEffect, useReducer, useState, type ReactNode } from "react";
import type { AppInfo } from "@pocket-apps/vite-config";
import { AppHeader } from "../app-shell/app-header.tsx";
import type { FileActions } from "./actions.ts";
import { DataFileBar } from "./data-file-bar.tsx";
import { DataFileStart } from "./data-file-start.tsx";
import { serializeEnvelope } from "./envelope.ts";
import { DataFileError } from "./errors.ts";
import { browserFileAccess, type FileAccess } from "./file-access.ts";
import { loadData } from "./migrate.ts";
import { dataFileReducer, type DataFileAction, type ReadyState } from "./reducer.ts";
import { currentVersion, type DataSchema } from "./schema.ts";

/** What the app components get from `useDataFile()`. */
export type DataFileApi<T> = {
  data: T;
  update: (updater: (data: T) => T) => void;
};

export type DataFileStoreOptions = {
  /** The app info for the header and the data file. Use `__POCKET_APP__`. */
  app: AppInfo;
  /** Wait time before an automatic save (Chrome, Edge). Default: 1000 ms. */
  autosaveDelayMs?: number;
};

export type DataFileProviderProps = {
  children: ReactNode;
  /** Only for tests. Default: the real browser file access. */
  fileAccess?: FileAccess;
};

export function backupFileName(fileName: string, version: number): string {
  return `${fileName.replace(/\.json$/i, "")}.backup-v${String(version)}.json`;
}

function errorMessage(error: unknown): string {
  if (error instanceof DataFileError) return error.message;
  return `Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Creates the data file store for one app.
 * Call it once per app, at module level, with the app's schema.
 */
export function createDataFileStore<T>(schema: DataSchema<T>, options: DataFileStoreOptions) {
  const Context = createContext<DataFileApi<T> | null>(null);
  const schemaVersion = currentVersion(schema);
  const autosaveDelayMs = options.autosaveDelayMs ?? 1000;

  function serialize(data: T): string {
    return serializeEnvelope({
      app: schema.app,
      schemaVersion,
      appVersion: options.app.version,
      data,
    });
  }

  async function write(
    files: FileAccess,
    state: ReadyState<T>,
    dispatch: (action: DataFileAction<T>) => void,
  ): Promise<void> {
    const text = serialize(state.data);
    if (state.handle) {
      await files.writeFile(state.handle, text);
    } else {
      files.downloadFile(state.fileName, text);
    }
    dispatch({ type: "saved", data: state.data });
  }

  function DataFileProvider({
    children,
    fileAccess: files = browserFileAccess,
  }: DataFileProviderProps) {
    const [state, dispatch] = useReducer(dataFileReducer<T>, { status: "empty" });
    const [error, setError] = useState<string | null>(null);
    const directSave = files.supportsDirectSave();

    async function run(task: () => Promise<void>): Promise<void> {
      setError(null);
      try {
        await task();
      } catch (caught) {
        setError(errorMessage(caught));
      }
    }

    const actions: FileActions = {
      error,
      directSave,
      createNew: () =>
        run(async () => {
          const data = schema.initial();
          const fileName = `${schema.app}.json`;
          if (!directSave) {
            dispatch({
              type: "loaded",
              state: {
                status: "ready",
                data,
                fileName,
                handle: null,
                dirty: true,
                pendingMigration: false,
              },
            });
            return;
          }
          const handle = await files.createFile(fileName);
          if (!handle) return;
          await files.writeFile(handle, serialize(data));
          dispatch({
            type: "loaded",
            state: {
              status: "ready",
              data,
              fileName: handle.name,
              handle,
              dirty: false,
              pendingMigration: false,
            },
          });
        }),
      open: () =>
        run(async () => {
          const file = await files.openFile();
          if (!file) return;
          const result = loadData(file.text, schema);
          const migrated = result.migratedFrom !== null;
          if (result.migratedFrom !== null) {
            // Keep the old file as a backup. The app does not overwrite the file
            // before the user clicks "Speichern" (see pendingMigration).
            files.downloadFile(backupFileName(file.name, result.migratedFrom), file.text);
          }
          dispatch({
            type: "loaded",
            state: {
              status: "ready",
              data: result.data,
              fileName: file.name,
              handle: file.handle,
              dirty: migrated,
              pendingMigration: migrated,
            },
          });
        }),
    };

    // Automatic save: only with a file handle (Chrome, Edge), not after a migration,
    // and not after a failed save. Then the user saves with the "Speichern" button.
    const autosaving =
      state.status === "ready" && state.handle !== null && !state.pendingMigration && !error;
    useEffect(() => {
      if (state.status !== "ready" || !state.dirty || !autosaving) return;
      const timer = setTimeout(() => {
        write(files, state, dispatch).catch((caught: unknown) => {
          setError(
            `Automatisches Speichern ist fehlgeschlagen. Klicke auf „Speichern“. (${errorMessage(caught)})`,
          );
        });
      }, autosaveDelayMs);
      return () => {
        clearTimeout(timer);
      };
    }, [files, state, autosaving]);

    // Warn before the user closes the tab with unsaved changes.
    const dirty = state.status === "ready" && state.dirty;
    useEffect(() => {
      if (!dirty) return;
      const onBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
      };
      window.addEventListener("beforeunload", onBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", onBeforeUnload);
      };
    }, [dirty]);

    const header = <AppHeader app={options.app} />;

    if (state.status === "empty") {
      return (
        <>
          {header}
          <DataFileStart file={actions} />
        </>
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
        {header}
        <DataFileBar
          file={{
            ...actions,
            fileName: state.fileName,
            dirty: state.dirty,
            autosaving,
            pendingMigration: state.pendingMigration,
            save: () => run(() => write(files, state, dispatch)),
          }}
        />
        {children}
      </Context>
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
