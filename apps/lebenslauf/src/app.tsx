import type { FolderHost } from "@pocket-apps/core/data-file";
import { LebenslaufView } from "./lebenslauf-view.tsx";
import { preparePhoto } from "./photo.ts";
import { DataFileProvider } from "./schema.ts";

export type AppProps = {
  /** Only for tests. Default: the data folder of the browser. */
  folderHost?: FolderHost;
  /** Only for tests: jsdom has no canvas. Default: cut and scale with a canvas. */
  preparePhoto?: (file: Blob) => Promise<Blob>;
};

export function App({ folderHost, preparePhoto: prepare = preparePhoto }: AppProps) {
  return (
    <DataFileProvider {...(folderHost && { folderHost })}>
      <LebenslaufView preparePhoto={prepare} />
    </DataFileProvider>
  );
}
