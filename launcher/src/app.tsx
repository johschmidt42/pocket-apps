import type { AppInfo } from "@pocket-apps/vite-config";
import type { FolderHost } from "@pocket-apps/core/data-file";
import { TooltipProvider } from "@pocket-apps/ui/components/tooltip";
import { LauncherView } from "./launcher-view.tsx";
import { DataFileProvider } from "./schema.ts";

export type AppProps = {
  /** Only for tests. Default: all apps of the build. */
  apps?: readonly AppInfo[];
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
};

/** The launcher: all apps, the data folder and the order of the apps (`launcher.json`). */
export function App({ apps = __POCKET_APPS__, folderHost }: AppProps) {
  return (
    <TooltipProvider>
      <DataFileProvider {...(folderHost && { folderHost })}>
        <LauncherView apps={apps} />
      </DataFileProvider>
    </TooltipProvider>
  );
}
