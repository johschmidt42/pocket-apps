import type { AppInfo } from "@pocket-apps/vite-config";
import { Button } from "@pocket-apps/ui/components/button";
import { Card, CardAction, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { flushSync } from "react-dom";
import type { Direction } from "./app-order.ts";

export const DONE_BUTTON_ID = "order-done";

/** The DOM ID of a move button. It lets the list keep the keyboard focus. */
function buttonId(name: string, direction: Direction): string {
  return `order-${name}-${direction}`;
}

export type OrderEditorProps = {
  /** The apps in the current order. */
  apps: readonly AppInfo[];
  onMove: (name: string, direction: Direction) => void;
  onDone: () => void;
};

/** Lets the person move each app up or down. The launcher shows the apps in this order. */
export function OrderEditor({ apps, onMove, onDone }: OrderEditorProps) {
  const lastIndex = apps.length - 1;

  function move(app: AppInfo, index: number, direction: Direction) {
    // Render at once, then keep the focus on the moved app.
    flushSync(() => {
      onMove(app.name, direction);
    });
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const atEdge = direction === "up" ? newIndex === 0 : newIndex === lastIndex;
    const opposite: Direction = direction === "up" ? "down" : "up";
    document.getElementById(buttonId(app.name, atEdge ? opposite : direction))?.focus();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reihenfolge ändern</h2>
        <Button id={DONE_BUTTON_ID} onClick={onDone}>
          <Check data-icon="inline-start" />
          Fertig
        </Button>
      </div>
      <ol className="flex flex-col gap-2">
        {apps.map((app, index) => (
          <li key={app.name}>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true">{app.emoji}</span>
                  <h3 className="wrap-anywhere">{app.title}</h3>
                </CardTitle>
                <CardAction className="flex gap-1">
                  <Button
                    id={buttonId(app.name, "up")}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${app.title} nach oben`}
                    disabled={index === 0}
                    onClick={() => {
                      move(app, index, "up");
                    }}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    id={buttonId(app.name, "down")}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${app.title} nach unten`}
                    disabled={index === lastIndex}
                    onClick={() => {
                      move(app, index, "down");
                    }}
                  >
                    <ArrowDown />
                  </Button>
                </CardAction>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
