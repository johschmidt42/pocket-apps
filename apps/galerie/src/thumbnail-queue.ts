export type ThumbnailQueueOptions<T> = {
  /** How many thumbnails load at the same time. Google Drive is much faster with several. */
  concurrency: number;
  /** Loads the thumbnail for a key. A rejected promise counts as "failed". */
  load: (key: string) => Promise<T>;
  /** Gets each result: the thumbnail, or `null` if it failed. Not called after `stop()`. */
  onResult: (key: string, thumbnail: T | null) => void;
  /** Frees a thumbnail, for example its object URL. Called by `stop()`. */
  dispose: (thumbnail: T) => void;
};

export type ThumbnailQueue = {
  /** Tells the queue that the row of `key` is visible or not. Only visible rows load. */
  setVisible: (key: string, visible: boolean) => void;
  /** Stops the queue and frees all thumbnails, also those that are still loading. */
  stop: () => void;
};

/**
 * Loads thumbnails only for visible rows, in the order in which they became visible,
 * and at most `concurrency` at the same time. Each key loads once.
 * Thus a jump to the end of a long list shows the thumbnails there at once, and a folder
 * in Google Drive does not download all photos.
 */
export function createThumbnailQueue<T>(options: ThumbnailQueueOptions<T>): ThumbnailQueue {
  const { concurrency, load, onResult, dispose } = options;
  const visible = new Set<string>();
  const started = new Set<string>();
  const delivered: T[] = [];
  let running = 0;
  let stopped = false;

  function nextKey(): string | undefined {
    for (const key of visible) if (!started.has(key)) return key;
    return undefined;
  }

  function startMore(): void {
    while (!stopped && running < concurrency) {
      const key = nextKey();
      if (key === undefined) return;
      started.add(key);
      running++;
      void run(key);
    }
  }

  async function run(key: string): Promise<void> {
    let thumbnail: T | null = null;
    try {
      thumbnail = await load(key);
    } catch {
      // A file that the browser cannot decode. The row shows an icon instead.
    }
    running--;
    if (stopped) {
      if (thumbnail !== null) dispose(thumbnail);
      return;
    }
    if (thumbnail !== null) delivered.push(thumbnail);
    onResult(key, thumbnail);
    startMore();
  }

  return {
    setVisible(key, isVisible) {
      if (isVisible) visible.add(key);
      else visible.delete(key);
      startMore();
    },
    stop() {
      stopped = true;
      for (const thumbnail of delivered) dispose(thumbnail);
      delivered.length = 0;
    },
  };
}
