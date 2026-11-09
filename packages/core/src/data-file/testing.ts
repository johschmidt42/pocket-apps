import type { FileAccess, FileHandle, OpenedFile } from "./file-access.ts";

export type MemoryFileAccess = FileAccess & {
  /** The file that the next `openFile()` returns. `null` means: the user cancels. */
  nextOpen: OpenedFile | null;
  /** The name that the next `createFile()` returns. `null` means: the user cancels. */
  nextCreateName: string | null;
  /** All texts written with `writeFile()`, by file name. */
  written: Map<string, string>;
  /** All downloads, in order. */
  downloads: { name: string; text: string }[];
};

/** An in-memory fake of the file access. Use it in tests instead of mocks. */
export function createMemoryFileAccess(options: { directSave: boolean }): MemoryFileAccess {
  const fake: MemoryFileAccess = {
    nextOpen: null,
    nextCreateName: null,
    written: new Map(),
    downloads: [],
    supportsDirectSave: () => options.directSave,
    openFile: () => Promise.resolve(fake.nextOpen),
    createFile: () => {
      const name = fake.nextCreateName;
      const handle: FileHandle | null = name === null ? null : { name };
      return Promise.resolve(handle);
    },
    writeFile: (handle, text) => {
      fake.written.set(handle.name, text);
      return Promise.resolve();
    },
    downloadFile: (name, text) => {
      fake.downloads.push({ name, text });
    },
  };
  return fake;
}
