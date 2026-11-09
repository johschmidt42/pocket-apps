import { IdeaListView } from "./idea-list-view.tsx";
import { DataFileProvider } from "./schema.ts";

export function App() {
  return (
    <DataFileProvider>
      <IdeaListView />
    </DataFileProvider>
  );
}
