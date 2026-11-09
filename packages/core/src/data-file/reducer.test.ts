import { describe, expect, it } from "vitest";
import { dataFileReducer, type DataFileState, type ReadyState } from "./reducer.ts";

type Data = { count: number };

const ready: ReadyState<Data> = {
  status: "ready",
  data: { count: 1 },
  lastModified: 5,
  save: "saved",
  error: null,
};

describe("dataFileReducer", () => {
  it("ignores save actions while no file is loaded", () => {
    const loading: DataFileState<Data> = { status: "loading" };

    expect(dataFileReducer(loading, { type: "saving" })).toBe(loading);
    expect(dataFileReducer(loading, { type: "updated", updater: (d) => d })).toBe(loading);
  });

  it("marks loaded data as pending when the file does not have it yet", () => {
    const state = dataFileReducer<Data>(
      { status: "loading" },
      { type: "loaded", data: { count: 2 }, needsSave: true, lastModified: 1 },
    );

    expect(state).toMatchObject({ status: "ready", save: "pending" });
  });

  it("keeps the status of a running save when the data changes", () => {
    const saving = dataFileReducer(ready, { type: "saving" });
    const changed = dataFileReducer(saving, {
      type: "updated",
      updater: (d) => ({ count: d.count + 1 }),
    });

    expect(changed).toMatchObject({ save: "saving", data: { count: 2 } });
  });

  it("clears the error and takes the new time on overwrite", () => {
    const failed = dataFileReducer(ready, { type: "failed", message: "x" });

    expect(dataFileReducer(failed, { type: "overwrite", lastModified: 9 })).toMatchObject({
      save: "pending",
      error: null,
      lastModified: 9,
    });
  });
});
