export type { ExtraFiles } from "./extra-files.ts";
export type { DataFolder, FileSnapshot, FolderHost } from "./folder.ts";
export { currentVersion, defineDataSchema, type DataSchema, type Migration } from "./schema.ts";
export {
  createDataFileStore,
  type DataFileApi,
  type DataFileProviderProps,
  type DataFileStoreOptions,
} from "./store.tsx";
