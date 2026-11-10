import { useEffect, useState } from "react";
import type { DataFolder, FolderHost } from "./folder.ts";

export type FolderState =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "missing" }
  | { status: "locked"; folder: DataFolder; denied: boolean }
  | { status: "ready"; folder: DataFolder };

function stateFor(folder: DataFolder, access: PermissionState): FolderState {
  return access === "granted"
    ? { status: "ready", folder }
    : { status: "locked", folder, denied: access === "denied" };
}

function folderErrorMessage(error: unknown): string {
  return `Der Datenordner ist nicht verfügbar: ${error instanceof Error ? error.message : String(error)}`;
}

/** Finds the remembered data folder and its access state. Offers pick (also to change the folder) and grant. */
export function useDataFolder(host: FolderHost) {
  const [state, setState] = useState<FolderState>(() =>
    host.isSupported() ? { status: "checking" } : { status: "unsupported" },
  );
  const [error, setError] = useState<string | null>(null);
  // Counts the picked folders. A new number gives the app a fresh start with the new folder.
  const [pickCount, setPickCount] = useState(0);

  // The remembered folder lives in the browser storage (an external system).
  useEffect(() => {
    if (state.status !== "checking") return;
    // An object: ESLint does not see that the cleanup changes a plain variable.
    const run = { active: true };
    void (async () => {
      try {
        const folder = await host.loadSaved();
        const next: FolderState = folder
          ? stateFor(folder, await folder.queryAccess())
          : { status: "missing" };
        if (run.active) setState(next);
      } catch (caught) {
        if (run.active) {
          setError(folderErrorMessage(caught));
          setState({ status: "missing" });
        }
      }
    })();
    return () => {
      run.active = false;
    };
  }, [host, state.status]);

  async function pick(): Promise<void> {
    setError(null);
    try {
      const folder = await host.pick();
      if (!folder) return;
      setState(stateFor(folder, await folder.queryAccess()));
      setPickCount((count) => count + 1);
    } catch (caught) {
      setError(folderErrorMessage(caught));
    }
  }

  async function grant(folder: DataFolder): Promise<void> {
    setError(null);
    try {
      setState(stateFor(folder, await folder.requestAccess()));
    } catch (caught) {
      setError(folderErrorMessage(caught));
    }
  }

  return { state, error, pickCount, pick, grant };
}
