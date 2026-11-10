import type { AppInfo } from "@pocket-apps/vite-config";
import { Button } from "@pocket-apps/ui/components/button";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { ArrowUpDown, Search } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { AppCard } from "./app-card.tsx";
import { moveApp, orderApps } from "./app-order.ts";
import { filterApps } from "./filter-apps.ts";
import { DONE_BUTTON_ID, OrderEditor } from "./order-editor.tsx";
import { useDataFile } from "./schema.ts";

const SORT_BUTTON_ID = "order-edit";

/** The searchable grid of all apps, in the order of the person. Use it inside `DataFileProvider`. */
export function LauncherView({ apps }: { apps: readonly AppInfo[] }) {
  const { data, update, hasFolder } = useDataFile();
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState(false);
  const ordered = orderApps(apps, data.order);
  const visible = filterApps(ordered, query);

  // Render the other view at once, then move the focus into it.
  function switchView(next: boolean, focusId: string) {
    flushSync(() => {
      setSorting(next);
    });
    document.getElementById(focusId)?.focus();
  }

  if (sorting && hasFolder) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <OrderEditor
          apps={ordered}
          onMove={(name, direction) => {
            update(() => ({ order: moveApp(ordered, name, direction) }));
          }}
          onDone={() => {
            switchView(false, SORT_BUTTON_ID);
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Label htmlFor="search" className="sr-only">
            Apps durchsuchen
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="search"
            type="search"
            placeholder="Apps durchsuchen"
            className="pl-8"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </div>
        {hasFolder && (
          <Button
            id={SORT_BUTTON_ID}
            variant="outline"
            onClick={() => {
              setQuery("");
              switchView(true, DONE_BUTTON_ID);
            }}
          >
            <ArrowUpDown data-icon="inline-start" />
            Reihenfolge ändern
          </Button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine App passt zu „{query}“.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((app) => (
            <li key={app.name}>
              <AppCard app={app} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
