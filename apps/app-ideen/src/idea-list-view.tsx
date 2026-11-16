import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { DragHandle } from "@pocket-apps/ui/drag-handle";
import { moveById, moveTo, useDragSort } from "@pocket-apps/ui/drag-sort";
import { SortHint } from "@pocket-apps/ui/sort-hint";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { addIdea, newId, removeIdea } from "./ideas.ts";
import { useDataFile, type Idea } from "./schema.ts";

const TITLE_INPUT_ID = "idea-title";

/** The DOM ID of the delete button of one idea. It lets the list keep the keyboard focus. */
function deleteButtonId(ideaId: string): string {
  return `idea-${ideaId}-delete`;
}

function focusElement(id: string): void {
  document.getElementById(id)?.focus();
}

/** The list of app ideas. Use it only inside `DataFileProvider`. */
export function IdeaListView() {
  const { data, update } = useDataFile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Drag and drop with the grip at the left of each idea, or the arrow keys on the grip.
  const sort = useDragSort({
    onDrop: (draggedId, targetId, position) => {
      update((list) => ({ ...list, ideas: moveTo(list.ideas, draggedId, targetId, position) }));
    },
    onStep: (id, direction) => {
      update((list) => ({ ...list, ideas: moveById(list.ideas, id, direction) }));
    },
  });

  function remove(idea: Idea, index: number) {
    if (!window.confirm(`Idee „${idea.title}“ löschen?`)) return;
    const neighbour = data.ideas[index + 1] ?? data.ideas[index - 1];
    flushSync(() => {
      update((list) => removeIdea(list, idea.id));
    });
    focusElement(neighbour ? deleteButtonId(neighbour.id) : TITLE_INPUT_ID);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <SortHint />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Neue Idee</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              update((list) => addIdea(list, { id: newId(), title, description }));
              setTitle("");
              setDescription("");
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor={TITLE_INPUT_ID}>Titel</Label>
              <Input
                id={TITLE_INPUT_ID}
                placeholder="z. B. Pflanzen gießen"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-description">Beschreibung</Label>
              <Textarea
                id="idea-description"
                placeholder="Was soll die App können?"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
              />
            </div>
            <Button type="submit" className="self-start" disabled={title.trim() === ""}>
              <Plus data-icon="inline-start" />
              Hinzufügen
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold">Ideen ({data.ideas.length})</h2>
      {data.ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Ideen.</p>
      ) : (
        <ol className="flex flex-col gap-3" {...sort.listProps()}>
          {data.ideas.map((idea, index) => (
            <li key={idea.id} {...sort.rowProps(idea.id)} className={sort.rowClass(idea.id)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex min-w-0 items-center gap-2">
                    <DragHandle name={idea.title} {...sort.handleProps(idea.id)} />
                    <h3 className="min-w-0 wrap-anywhere">{idea.title}</h3>
                  </CardTitle>
                  {idea.description !== "" && (
                    <CardDescription className="min-w-0 pl-10 wrap-anywhere whitespace-pre-line">
                      {idea.description}
                    </CardDescription>
                  )}
                  <CardAction className="flex gap-1">
                    <Button
                      id={deleteButtonId(idea.id)}
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${idea.title} löschen`}
                      onClick={() => {
                        remove(idea, index);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </CardAction>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
