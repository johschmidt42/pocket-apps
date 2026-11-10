import type { FolderHost } from "@pocket-apps/core/data-file";
import { REQUEST_GAP_MS } from "./alpha-vantage.ts";
import { fetchJson as browserFetchJson, type FetchJson } from "./fetch-json.ts";
import { KursverlaufView } from "./kursverlauf-view.tsx";
import { DataFileProvider } from "./schema.ts";

export type AppProps = {
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
  /** Only for tests. Default: `fetch`. */
  fetchJson?: FetchJson;
  /** Only for tests. Default: the gap that Alpha Vantage needs. */
  gapMs?: number;
};

export function App({
  folderHost,
  fetchJson = browserFetchJson,
  gapMs = REQUEST_GAP_MS,
}: AppProps) {
  return (
    <DataFileProvider {...(folderHost && { folderHost })}>
      <KursverlaufView fetchJson={fetchJson} gapMs={gapMs} />
    </DataFileProvider>
  );
}
