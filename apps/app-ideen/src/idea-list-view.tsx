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
import { addIdea, moveIdea, newId, removeIdea } from "./ideas.ts";
import { useDataFile } from "./schema.ts";

/** The list of app ideas. Use it only inside `DataFileProvider`. */
export function IdeaListView() {
  const { data, update } = useDataFile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const lastIndex = data.ideas.length - 1;

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
              update((list) => addIdea(list, title, description, newId()));
              setTitle("");
              setDescription("");
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-title">Titel</Label>
              <Input
                id="idea-title"
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
                  <CardTitle>
                    <h3 className="break-words">{idea.title}</h3>
                  </CardTitle>
                  {idea.description !== "" && (
                    <CardDescription className="break-words whitespace-pre-line">
                      {idea.description}
                    </CardDescription>
                  )}
                  <CardAction className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${idea.title} nach oben`}
                      disabled={index === 0}
                      onClick={() => {
                        update((list) => moveIdea(list, idea.id, "up"));
                      }}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${idea.title} nach unten`}
                      disabled={index === lastIndex}
                      onClick={() => {
                        update((list) => moveIdea(list, idea.id, "down"));
                      }}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${idea.title} löschen`}
                      onClick={() => {
                        update((list) => removeIdea(list, idea.id));
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
