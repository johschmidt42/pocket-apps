import type { AskAi } from "@pocket-apps/core/ai";
import type { FolderHost } from "@pocket-apps/core/data-file";
import { LogbookView } from "./logbook-view.tsx";
import { DataFileProvider } from "./schema.ts";

export type AppProps = {
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
  /** Only for tests: a fake for the requests to the AI. */
  ask?: AskAi;
};

export function App({ folderHost, ask }: AppProps) {
  return (
    <DataFileProvider {...(folderHost && { folderHost })}>
      <LogbookView ask={ask} />
    </DataFileProvider>
  );
}
