export type { FileAccess } from "./file-access.ts";
export { currentVersion, defineDataSchema, type DataSchema, type Migration } from "./schema.ts";
export {
  createDataFileStore,
  type DataFileApi,
  type DataFileProviderProps,
  type DataFileStoreOptions,
} from "./store.tsx";
