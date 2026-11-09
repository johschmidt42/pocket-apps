/**
 * - "saved": the file has the current data.
 * - "pending": there are changes; the app saves them soon.
 * - "saving": the app writes the file now.
 * - "failed": the last write failed; the app tries again soon.
 * - "conflict": the file changed elsewhere since the app read it; the person decides.
 */
export type SaveStatus = "saved" | "pending" | "saving" | "failed" | "conflict";

export type ReadyState<T> = {
  status: "ready";
  data: T;
  /** The time of the last change of the file when the app read or wrote it. `null` = no file yet. */
  lastModified: number | null;
  save: SaveStatus;
  error: string | null;
};

export type DataFileState<T> =
  { status: "loading" } | { status: "broken"; message: string } | ReadyState<T>;

export type DataFileAction<T> =
  | { type: "loading" }
  /** `needsSave`: the file does not have the current shape yet (after a migration). */
  | { type: "loaded"; data: T; needsSave: boolean; lastModified: number | null }
  | { type: "broken"; message: string }
  | { type: "updated"; updater: (data: T) => T }
  | { type: "saving" }
  | { type: "saved"; data: T; lastModified: number }
  | { type: "failed"; message: string }
  | { type: "conflict" }
  | { type: "retry" }
  | { type: "overwrite"; lastModified: number | null };

type FileAction<T> = Exclude<DataFileAction<T>, { type: "loading" | "loaded" | "broken" }>;

export function dataFileReducer<T>(
  state: DataFileState<T>,
  action: DataFileAction<T>,
): DataFileState<T> {
  if (action.type === "loading") return { status: "loading" };
  if (action.type === "broken") return { status: "broken", message: action.message };
  if (action.type === "loaded") {
    return {
      status: "ready",
      data: action.data,
      lastModified: action.lastModified,
      save: action.needsSave ? "pending" : "saved",
      error: null,
    };
  }
  // The other actions only apply to a loaded file.
  return state.status === "ready" ? fileReducer(state, action) : state;
}

function fileReducer<T>(state: ReadyState<T>, action: FileAction<T>): ReadyState<T> {
  switch (action.type) {
    case "updated":
      return {
        ...state,
        data: action.updater(state.data),
        // During a save or a conflict, the status stays. "saved" then sees the new data.
        save: state.save === "conflict" || state.save === "saving" ? state.save : "pending",
      };
    case "saving":
      return { ...state, save: "saving" };
    case "saved":
      return {
        ...state,
        lastModified: action.lastModified,
        // If the data changed while the app saved, it saves again.
        save: state.data === action.data ? "saved" : "pending",
        error: null,
      };
    case "failed":
      return { ...state, save: "failed", error: action.message };
    case "conflict":
      return { ...state, save: "conflict" };
    case "retry":
      return { ...state, save: "pending", error: null };
    case "overwrite":
      return { ...state, lastModified: action.lastModified, save: "pending", error: null };
  }
}
