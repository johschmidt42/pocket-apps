import { PurchaseListView } from "./purchase-list-view.tsx";
import { DataFileProvider } from "./schema.ts";

export function App() {
  return (
    <DataFileProvider>
      <PurchaseListView />
    </DataFileProvider>
  );
}
