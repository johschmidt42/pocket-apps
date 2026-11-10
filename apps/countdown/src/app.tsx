import type { FolderHost } from "@pocket-apps/core/data-file";
import { CountdownView } from "./countdown-view.tsx";
import { DataFileProvider } from "./schema.ts";
import type { Clock } from "./use-now.ts";

export type AppProps = {
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
  /** Only for tests. Default: the clock of the computer. */
  clock?: Clock;
};

export function App({ folderHost, clock }: AppProps) {
  return (
    <DataFileProvider {...(folderHost && { folderHost })}>
      <CountdownView {...(clock && { clock })} />
    </DataFileProvider>
  );
}
