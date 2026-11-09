import type { FileHandle } from "./file-access.ts";

export type ReadyState<T> = {
  status: "ready";
  data: T;
  fileName: string;
  /** Only in Chrome and Edge. With a handle, the app can save automatically. */
  handle: FileHandle | null;
  /** True if there are changes that are not in the file yet. */
  dirty: boolean;
  /**
   * True after a migration until the first save. The app does not save automatically then.
   * The user first checks the backup and then clicks "Speichern".
   */
  pendingMigration: boolean;
};

export type DataFileState<T> = { status: "empty" } | ReadyState<T>;

export type DataFileAction<T> =
  | { type: "loaded"; state: ReadyState<T> }
  | { type: "updated"; updater: (data: T) => T }
  | { type: "saved"; data: T };

export function dataFileReducer<T>(
  state: DataFileState<T>,
  action: DataFileAction<T>,
): DataFileState<T> {
  if (action.type === "loaded") return action.state;
  // Updates and saves only apply to a loaded file.
  if (state.status !== "ready") return state;
  switch (action.type) {
    case "updated":
      return { ...state, data: action.updater(state.data), dirty: true };
    case "saved":
      // If the data changed while we saved, it is still dirty.
      return { ...state, dirty: state.data !== action.data, pendingMigration: false };
  }
}
