import type { AppInfo } from "@pocket-apps/vite-config";
import { Button } from "@pocket-apps/ui/components/button";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { ArrowUpDown, Search } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { AppGrid } from "./app-grid.tsx";
import { moveApp, orderApps } from "./app-order.ts";
import { favoriteButtonId, splitFavorites, toggleFavorite } from "./favorites.ts";
import { filterApps } from "./filter-apps.ts";
import { DONE_BUTTON_ID, OrderEditor } from "./order-editor.tsx";
import { useDataFile } from "./schema.ts";

const SORT_BUTTON_ID = "order-edit";

/**
 * The searchable grid of all apps, in the order of the person. Use it inside `DataFileProvider`.
 * With favorites, it shows two sections: "Favoriten" first, then "Weitere Apps".
 */
export function LauncherView({ apps }: { apps: readonly AppInfo[] }) {
  const { data, update, hasFolder } = useDataFile();
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState(false);
  const ordered = orderApps(apps, data.order);
  const visible = filterApps(ordered, query);
  // Decide on the sections from all apps, not from the search result. Then they stay while the person types.
  const withSections = ordered.some((app) => data.favorites.includes(app.name));
  const favoriteGroups = splitFavorites(visible, data.favorites);
  const sections = [
    { id: "favorites-heading", title: "Favoriten", apps: favoriteGroups.favorites },
    { id: "others-heading", title: "Weitere Apps", apps: favoriteGroups.others },
  ].filter((section) => section.apps.length > 0);

  // Render the other view at once, then move the focus into it.
  function switchView(next: boolean, focusId: string) {
    flushSync(() => {
      setSorting(next);
    });
    document.getElementById(focusId)?.focus();
  }

  // The card moves to the other section. Render at once, then keep the focus on its button.
  function toggleFavoriteOf(name: string) {
    flushSync(() => {
      update((current) => ({ ...current, favorites: toggleFavorite(current.favorites, name) }));
    });
    document.getElementById(favoriteButtonId(name))?.focus();
  }

  if (sorting && hasFolder) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <OrderEditor
          apps={ordered}
          favorites={data.favorites}
          onMove={(name, direction) => {
            update((current) => ({ ...current, order: moveApp(ordered, name, direction) }));
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
      ) : withSections ? (
        sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id} className="flex flex-col gap-2">
            <h2 id={section.id} className="text-sm font-medium text-muted-foreground">
              {section.title}
            </h2>
            <AppGrid
              apps={section.apps}
              heading="h3"
              favorites={data.favorites}
              {...(hasFolder && { onToggleFavorite: toggleFavoriteOf })}
            />
          </section>
        ))
      ) : (
        <AppGrid
          apps={visible}
          heading="h2"
          favorites={data.favorites}
          {...(hasFolder && { onToggleFavorite: toggleFavoriteOf })}
        />
      )}
    </main>
  );
}
