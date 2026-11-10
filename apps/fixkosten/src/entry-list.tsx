import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { addButtonId, entryButtonId } from "./dom-ids.ts";
import type { EntryRow } from "./rows.ts";

export type EntryListProps = {
  id: string;
  title: string;
  description: string;
  rows: readonly EntryRow[];
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

/** A card with a list of entries (costs or incomes) and a button to add one. */
export function EntryList({
  id,
  title,
  description,
  rows,
  emptyText,
  addLabel,
  onAdd,
  onEdit,
  onRemove,
}: EntryListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 id={id}>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button id={addButtonId(id)} variant="outline" size="sm" onClick={onAdd}>
            <Plus data-icon="inline-start" />
            {addLabel}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul aria-labelledby={id} className="flex flex-col divide-y">
            {rows.map((row) => (
              // In narrow windows, the amount and the buttons go to a second line.
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span
                  aria-hidden="true"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${row.iconClass}`}
                >
                  <row.icon className="size-4" />
                </span>
                <div className="flex min-w-40 flex-1 flex-col">
                  <span className="truncate font-medium">{row.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{row.detail}</span>
                </div>
                <div className="ml-auto flex flex-col items-end text-right">
                  <span className="font-medium tabular-nums">{row.amount}</span>
                  {row.equivalent && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {row.equivalent}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0">
                  <Button
                    id={entryButtonId(row.id, "edit")}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${row.name} bearbeiten`}
                    onClick={() => {
                      onEdit(row.id);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    id={entryButtonId(row.id, "remove")}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${row.name} löschen`}
                    onClick={() => {
                      onRemove(row.id);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
