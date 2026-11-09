import { Button } from "@pocket-apps/ui/components/button";
import { Card, CardContent, CardFooter } from "@pocket-apps/ui/components/card";
import { Checkbox } from "@pocket-apps/ui/components/checkbox";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { addItem, clearDone, newId, removeItem, toggleItem } from "./items.ts";
import { useDataFile } from "./schema.ts";

/** The shopping list. Use it only inside `DataFileProvider`. */
export function ShoppingListView() {
  const { data, update } = useDataFile();
  const [name, setName] = useState("");
  const doneCount = data.items.filter((item) => item.done).length;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          update((list) => addItem(list, name, newId()));
          setName("");
        }}
      >
        <Label htmlFor="new-item" className="sr-only">
          Neuer Eintrag
        </Label>
        <Input
          id="new-item"
          placeholder="z. B. Milch"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <Button type="submit" disabled={name.trim() === ""}>
          <Plus data-icon="inline-start" />
          Hinzufügen
        </Button>
      </form>
      <Card>
        <CardContent>
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Die Liste ist leer.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={item.done}
                    onCheckedChange={() => {
                      update((list) => toggleItem(list, item.id));
                    }}
                  />
                  <Label
                    htmlFor={`item-${item.id}`}
                    className={item.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}
                  >
                    {item.name}
                  </Label>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${item.name} löschen`}
                    onClick={() => {
                      update((list) => removeItem(list, item.id));
                    }}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        {doneCount > 0 && (
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                update(clearDone);
              }}
            >
              Erledigte entfernen ({doneCount})
            </Button>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
