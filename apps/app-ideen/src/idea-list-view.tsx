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
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { addIdea, moveIdea, newId, removeIdea, type Direction } from "./ideas.ts";
import { useDataFile, type Idea } from "./schema.ts";

const TITLE_INPUT_ID = "idea-title";

/** The DOM ID of an action button of one idea. It lets the list keep the keyboard focus. */
function buttonId(ideaId: string, action: Direction | "delete"): string {
  return `idea-${ideaId}-${action}`;
}

function focusElement(id: string): void {
  document.getElementById(id)?.focus();
}

/** The list of app ideas. Use it only inside `DataFileProvider`. */
export function IdeaListView() {
  const { data, update } = useDataFile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const lastIndex = data.ideas.length - 1;

  function move(idea: Idea, index: number, direction: Direction) {
    // Render at once, then keep the focus on the moved idea.
    flushSync(() => {
      update((list) => moveIdea(list, idea.id, direction));
    });
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const atEdge = direction === "up" ? newIndex === 0 : newIndex === lastIndex;
    const opposite: Direction = direction === "up" ? "down" : "up";
    focusElement(buttonId(idea.id, atEdge ? opposite : direction));
  }

  function remove(idea: Idea, index: number) {
    if (!window.confirm(`Idee „${idea.title}“ löschen?`)) return;
    const neighbour = data.ideas[index + 1] ?? data.ideas[index - 1];
    flushSync(() => {
      update((list) => removeIdea(list, idea.id));
    });
    focusElement(neighbour ? buttonId(neighbour.id, "delete") : TITLE_INPUT_ID);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
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
        <ol className="flex flex-col gap-3">
          {data.ideas.map((idea, index) => (
            <li key={idea.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="min-w-0">
                    <h3 className="wrap-anywhere">{idea.title}</h3>
                  </CardTitle>
                  {idea.description !== "" && (
                    <CardDescription className="min-w-0 wrap-anywhere whitespace-pre-line">
                      {idea.description}
                    </CardDescription>
                  )}
                  <CardAction className="flex gap-1">
                    <Button
                      id={buttonId(idea.id, "up")}
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${idea.title} nach oben`}
                      disabled={index === 0}
                      onClick={() => {
                        move(idea, index, "up");
                      }}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      id={buttonId(idea.id, "down")}
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${idea.title} nach unten`}
                      disabled={index === lastIndex}
                      onClick={() => {
                        move(idea, index, "down");
                      }}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      id={buttonId(idea.id, "delete")}
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
