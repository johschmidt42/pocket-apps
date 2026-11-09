import { useEffect, useState } from "react";
import type { DataFolder, FolderHost } from "./folder.ts";

export type FolderState =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "missing" }
  | { status: "locked"; folder: DataFolder; denied: boolean }
  | { status: "ready"; folder: DataFolder };

async function stateFor(folder: DataFolder): Promise<FolderState> {
  const access = await folder.queryAccess();
  return access === "granted"
    ? { status: "ready", folder }
    : { status: "locked", folder, denied: access === "denied" };
}

function message(error: unknown): string {
  return `Der Datenordner ist nicht verfügbar: ${error instanceof Error ? error.message : String(error)}`;
}

/** Finds the remembered data folder and its access state. Offers pick and grant. */
export function useDataFolder(host: FolderHost) {
  const [state, setState] = useState<FolderState>(() =>
    host.isSupported() ? { status: "checking" } : { status: "unsupported" },
  );
  const [error, setError] = useState<string | null>(null);

  // The remembered folder lives in the browser storage (an external system).
  useEffect(() => {
    if (state.status !== "checking") return;
    // An object, so that the cleanup can change it while the request runs.
    const run = { active: true };
    void (async () => {
      try {
        const folder = await host.loadSaved();
        const next: FolderState = folder ? await stateFor(folder) : { status: "missing" };
        if (run.active) setState(next);
      } catch (caught) {
        if (run.active) {
          setError(message(caught));
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
      if (folder) setState(await stateFor(folder));
    } catch (caught) {
      setError(message(caught));
    }
  }

  async function grant(folder: DataFolder): Promise<void> {
    setError(null);
    try {
      const access = await folder.requestAccess();
      setState(
        access === "granted"
          ? { status: "ready", folder }
          : { status: "locked", folder, denied: access === "denied" },
      );
    } catch (caught) {
      setError(message(caught));
    }
  }

  return { state, error, pick, grant };
}
