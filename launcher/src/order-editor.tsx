import type { AppInfo } from "@pocket-apps/vite-config";
import { Button } from "@pocket-apps/ui/components/button";
import { Card, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { DragHandle } from "@pocket-apps/ui/drag-handle";
import { useDragSort, type Direction, type DropPosition } from "@pocket-apps/ui/drag-sort";
import { SortHint } from "@pocket-apps/ui/sort-hint";
import { Check, Star } from "lucide-react";

export const DONE_BUTTON_ID = "order-done";

export type OrderEditorProps = {
  /** The apps in the current order. */
  apps: readonly AppInfo[];
  /** Names of the favorite apps. They get a star. */
  favorites: readonly string[];
  /** An arrow key on the grip of an app: one place up (-1) or down (1). */
  onStep: (name: string, direction: Direction) => void;
  /** The person dropped an app before or after another app. */
  onDrop: (name: string, targetName: string, position: DropPosition) => void;
  onDone: () => void;
};

/**
 * Lets the person change the order of the apps with drag and drop: a grip at the left of each
 * app. The arrow keys on a grip also move its app. The launcher shows the apps in this order.
 */
export function OrderEditor({ apps, favorites, onStep, onDrop, onDone }: OrderEditorProps) {
  const sort = useDragSort({ onDrop, onStep });
  return (
    <>
      <SortHint />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reihenfolge ändern</h2>
        <Button id={DONE_BUTTON_ID} onClick={onDone}>
          <Check data-icon="inline-start" />
          Fertig
        </Button>
      </div>
      <ol className="flex flex-col gap-2" {...sort.listProps()}>
        {apps.map((app) => (
          <li key={app.name} {...sort.rowProps(app.name)} className={sort.rowClass(app.name)}>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex min-w-0 items-center gap-2">
                  <DragHandle name={app.title} {...sort.handleProps(app.name)} />
                  <span aria-hidden="true">{app.emoji}</span>
                  <h3 className="wrap-anywhere">{app.title}</h3>
                  {favorites.includes(app.name) && (
                    <Star
                      role="img"
                      aria-label="Favorit"
                      className="size-3.5 shrink-0 fill-current text-muted-foreground"
                    />
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
