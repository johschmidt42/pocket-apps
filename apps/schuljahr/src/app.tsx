import type { FolderHost } from "@pocket-apps/core/data-file";
import { fetchJson as browserFetchJson, type FetchJson } from "@pocket-apps/core/fetch-json";
import { TooltipProvider } from "@pocket-apps/ui/components/tooltip";
import { localIsoDate } from "./dates.ts";
import { DataFileProvider } from "./schema.ts";
import { SchuljahrView } from "./schuljahr-view.tsx";

export type AppProps = {
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
  /** Only for tests. Default: `fetch`. */
  fetchJson?: FetchJson;
  /** Only for tests. Default: the day of the computer. */
  today?: string;
};

export function App({
  folderHost,
  fetchJson = browserFetchJson,
  today = localIsoDate(new Date()),
}: AppProps) {
  return (
    <DataFileProvider {...(folderHost && { folderHost })}>
      <TooltipProvider>
        <SchuljahrView fetchJson={fetchJson} today={today} />
      </TooltipProvider>
    </DataFileProvider>
  );
}
