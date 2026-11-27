import { Button } from "@pocket-apps/ui/components/button";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { Check } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { editDescriptionId, editTitleInputId } from "./dom-ids.ts";
import type { IdeaChanges } from "./ideas.ts";
import type { Idea } from "./schema.ts";

type IdeaEditFormProps = {
  idea: Idea;
  onSave: (changes: IdeaChanges) => void;
  onCancel: () => void;
};

/**
 * The form to change one idea, in the place of the idea in the list. It is not a dialog: on a
 * phone, the keyboard can cover a dialog in the middle of the screen. Escape in a field cancels.
 */
export function IdeaEditForm({ idea, onSave, onCancel }: IdeaEditFormProps) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const titleId = editTitleInputId(idea.id);
  const descriptionId = editDescriptionId(idea.id);

  function cancelOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onCancel();
  }

  return (
    <form
      aria-label={`${idea.title} bearbeiten`}
      className="flex min-w-0 flex-1 flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ title, description });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={titleId}>Titel</Label>
        <Input
          id={titleId}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          onKeyDown={cancelOnEscape}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={descriptionId}>Beschreibung</Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
          onKeyDown={cancelOnEscape}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={title.trim() === ""}>
          <Check data-icon="inline-start" />
          Speichern
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
