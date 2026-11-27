import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { deleteButtonId, editButtonId, editTitleInputId } from "./dom-ids.ts";
import { IdeaEditForm } from "./idea-edit-form.tsx";
import { addIdea, editIdea, newId, removeIdea, type IdeaChanges } from "./ideas.ts";
import { useDataFile, type Idea } from "./schema.ts";

const TITLE_INPUT_ID = "idea-title";
/** The heading of the list. It gets the focus after the last idea is removed. */
const LIST_HEADING_ID = "ideas-heading";

function focusElement(id: string): void {
  document.getElementById(id)?.focus();
}

/** The list of app ideas. Use it only inside `DataFileProvider`. */
export function IdeaListView() {
  const { data, update } = useDataFile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Only one idea at a time has an open edit form. The other edit buttons are disabled:
  // a tap on them must not lose the changes in the open form.
  const [editingId, setEditingId] = useState<string | null>(null);
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
    // Not the title input: on a phone, its focus opens the keyboard and scrolls to the top.
    focusElement(neighbour ? deleteButtonId(neighbour.id) : LIST_HEADING_ID);
  }

  function startEdit(id: string) {
    flushSync(() => {
      setEditingId(id);
    });
    focusElement(editTitleInputId(id));
  }

  function closeEdit(id: string) {
    focusElement(editButtonId(id));
  }

  function saveEdit(id: string, changes: IdeaChanges) {
    flushSync(() => {
      update((list) => editIdea(list, id, changes));
      setEditingId(null);
    });
    closeEdit(id);
  }

  function cancelEdit(id: string) {
    flushSync(() => {
      setEditingId(null);
    });
    closeEdit(id);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <SortHint />
      <Card size="sm">
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

      <h2 id={LIST_HEADING_ID} tabIndex={-1} className="text-lg font-semibold outline-none">
        Ideen ({data.ideas.length})
      </h2>
      {data.ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Ideen.</p>
      ) : (
        <ol className="flex flex-col gap-2" {...sort.listProps()}>
          {data.ideas.map((idea, index) => (
            <li key={idea.id} {...sort.rowProps(idea.id)} className={sort.rowClass(idea.id)}>
              <Card size="sm">
                <CardContent className="flex items-start gap-2">
                  {editingId === idea.id ? (
                    <IdeaEditForm
                      idea={idea}
                      onSave={(changes) => {
                        saveEdit(idea.id, changes);
                      }}
                      onCancel={() => {
                        cancelEdit(idea.id);
                      }}
                    />
                  ) : (
                    <>
                      <DragHandle name={idea.title} {...sort.handleProps(idea.id)} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
                        <CardTitle>
                          <h3 className="wrap-anywhere">{idea.title}</h3>
                        </CardTitle>
                        {idea.description !== "" && (
                          <CardDescription className="wrap-anywhere whitespace-pre-line">
                            {idea.description}
                          </CardDescription>
                        )}
                      </div>
                      <Button
                        id={editButtonId(idea.id)}
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`${idea.title} bearbeiten`}
                        disabled={editingId !== null}
                        onClick={() => {
                          startEdit(idea.id);
                        }}
                      >
                        <Pencil />
                      </Button>
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
                    </>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
