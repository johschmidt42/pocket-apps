import { describe, expect, it } from "vitest";
import { dataFileReducer, type DataFileState, type ReadyState } from "./reducer.ts";

const ready: ReadyState<number> = {
  status: "ready",
  data: 1,
  fileName: "a.json",
  handle: null,
  dirty: false,
  pendingMigration: false,
};
const empty: DataFileState<number> = { status: "empty" };

describe("dataFileReducer", () => {
  it("replaces the state when a file is loaded", () => {
    expect(dataFileReducer(empty, { type: "loaded", state: ready })).toBe(ready);
  });

  it("applies an update and marks the state as dirty", () => {
    const next = dataFileReducer(ready, { type: "updated", updater: (n) => n + 1 });

    expect(next).toEqual({ ...ready, data: 2, dirty: true });
  });

  it("marks the state as clean after a save of the current data", () => {
    const dirty = { ...ready, dirty: true };

    expect(dataFileReducer(dirty, { type: "saved", data: 1 })).toEqual(ready);
  });

  it("ends a pending migration with the first save", () => {
    const migrated = { ...ready, dirty: true, pendingMigration: true };

    expect(dataFileReducer(migrated, { type: "saved", data: 1 })).toEqual(ready);
  });

  it("keeps the state dirty if the data changed during the save", () => {
    const dirty = { ...ready, data: 2, dirty: true };

    expect(dataFileReducer(dirty, { type: "saved", data: 1 })).toEqual({ ...dirty, dirty: true });
  });

  it("ignores updates and saves when no file is loaded", () => {
    expect(dataFileReducer<number>(empty, { type: "updated", updater: (n) => n + 1 })).toBe(empty);
    expect(dataFileReducer(empty, { type: "saved", data: 1 })).toBe(empty);
  });
});
