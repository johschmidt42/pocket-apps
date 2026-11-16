import type { FolderHost } from "@pocket-apps/core/data-file";
import { TooltipProvider } from "@pocket-apps/ui/components/tooltip";
import { localIsoDate } from "./dates.ts";
import { DataFileProvider } from "./schema.ts";
import { ZeitstrahlView } from "./zeitstrahl-view.tsx";

export type AppProps = {
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
  /** Only for tests. Default: the day of the computer. */
  today?: string;
};

export function App({ folderHost, today = localIsoDate(new Date()) }: AppProps) {
  return (
    <DataFileProvider {...(folderHost && { folderHost })}>
      <TooltipProvider>
        <ZeitstrahlView today={today} />
      </TooltipProvider>
    </DataFileProvider>
  );
}
