import type { AppInfo } from "@pocket-apps/vite-config";
import { AppHeader } from "@pocket-apps/core/app-shell";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Search } from "lucide-react";
import { useState } from "react";
import { AppCard } from "./app-card.tsx";
import { filterApps } from "./filter-apps.ts";

/** The launcher: a searchable grid of all apps. `apps` is only for tests. */
export function App({ apps = __POCKET_APPS__ }: { apps?: readonly AppInfo[] }) {
  const [query, setQuery] = useState("");
  const visible = filterApps(apps, query);

  return (
    <>
      <AppHeader app={__POCKET_APP__} />
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          Jede App ist eine einzelne Datei. Sie funktioniert ohne Internet.
        </p>
        <div className="relative">
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
    </>
  );
}
