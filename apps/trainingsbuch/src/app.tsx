import type { FolderHost } from "@pocket-apps/core/data-file";
import { LogbookView } from "./logbook-view.tsx";
import { DataFileProvider } from "./schema.ts";

export type AppProps = {
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
};

export function App({ folderHost }: AppProps) {
  return (
    <DataFileProvider {...(folderHost && { folderHost })}>
      <LogbookView />
    </DataFileProvider>
  );
}
