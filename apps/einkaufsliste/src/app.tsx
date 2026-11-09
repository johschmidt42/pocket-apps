import { DataFileProvider } from "./schema.ts";
import { ShoppingListView } from "./shopping-list-view.tsx";

export function App() {
  return (
    <DataFileProvider>
      <ShoppingListView />
    </DataFileProvider>
  );
}
