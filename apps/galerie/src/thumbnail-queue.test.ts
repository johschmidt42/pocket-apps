import { describe, expect, it, vi } from "vitest";
import { createThumbnailQueue } from "./thumbnail-queue.ts";

/** A queue with a fake loader. Each load waits until the test finishes it. */
function setup(concurrency = 2) {
  const pending = new Map<string, { resolve: (value: string) => void; reject: () => void }>();
  const load = vi.fn(
    (key: string) =>
      new Promise<string>((resolve, reject) => {
        pending.set(key, {
          resolve,
          reject: () => {
            reject(new Error("broken"));
          },
        });
      }),
  );
  const onResult = vi.fn();
  const dispose = vi.fn();
  const queue = createThumbnailQueue({ concurrency, load, onResult, dispose });
  const loading = () => load.mock.calls.map(([key]) => key);
  /** Finishes the load of `key` and waits until the queue handled it. */
  const finish = async (key: string, ok = true) => {
    const job = pending.get(key);
    if (ok) job?.resolve(`thumb-${key}`);
    else job?.reject();
    // A macrotask runs after all pending promise callbacks.
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { queue, loading, finish, onResult, dispose };
}

describe("createThumbnailQueue", () => {
  it("loads visible rows in their order, at most `concurrency` at the same time", async () => {
    const { queue, loading, finish, onResult } = setup(2);
    for (const key of ["a", "b", "c"]) queue.setVisible(key, true);
    expect(loading()).toEqual(["a", "b"]);

    await finish("a");
    expect(onResult).toHaveBeenCalledWith("a", "thumb-a");
    expect(loading()).toEqual(["a", "b", "c"]);
  });

  it("skips rows that are no longer visible and loads each row once", async () => {
    const { queue, loading, finish } = setup(1);
    queue.setVisible("a", true);
    queue.setVisible("b", true);
    queue.setVisible("c", true);
    // The user scrolls on: b leaves the screen before it loads.
    queue.setVisible("b", false);
    await finish("a");
    expect(loading()).toEqual(["a", "c"]);

    // a comes back into view: it does not load again.
    queue.setVisible("a", false);
    queue.setVisible("a", true);
    expect(loading()).toEqual(["a", "c"]);
  });

  it("reports a failed load as null and goes on", async () => {
    const { queue, loading, finish, onResult } = setup(1);
    queue.setVisible("a", true);
    queue.setVisible("b", true);
    await finish("a", false);
    expect(onResult).toHaveBeenCalledWith("a", null);
    expect(loading()).toEqual(["a", "b"]);
  });

  it("frees all thumbnails on stop, also those that come later, and reports nothing more", async () => {
    const { queue, loading, finish, onResult, dispose } = setup(2);
    queue.setVisible("a", true);
    queue.setVisible("b", true);
    await finish("a");
    queue.stop();
    expect(dispose).toHaveBeenCalledWith("thumb-a");

    await finish("b");
    expect(dispose).toHaveBeenCalledWith("thumb-b");
    expect(onResult).toHaveBeenCalledOnce();

    queue.setVisible("c", true);
    expect(loading()).toEqual(["a", "b"]);
  });

  it("frees nothing for a load that fails after stop", async () => {
    const { queue, finish, onResult, dispose } = setup(1);
    queue.setVisible("a", true);
    queue.stop();
    await finish("a", false);
    expect(onResult).not.toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
  });
});
