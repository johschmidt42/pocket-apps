import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { useId, useState } from "react";

/** What the dialog does: name a new item, or give an item a new name. */
export type NameRequest = { kind: "new" } | { kind: "rename"; name: string };

/** The German texts of the dialog, for example for a profile or a timeline. */
export type NameDialogTexts = {
  /** The title for a new item, for example "Neues Profil". */
  newTitle: string;
  /** The title for a new name, for example "Profil umbenennen". */
  renameTitle: string;
  /** The label of the name field, for example "Name des Profils". */
  label: string;
  /** An example name, for example "z. B. Wohnung Berlin". */
  placeholder: string;
};

export type NameDialogProps = {
  /** `null` closes the dialog. */
  request: NameRequest | null;
  texts: NameDialogTexts;
  /** Gets the name without spaces at the start and the end. */
  onSave: (name: string) => void;
  onClose: () => void;
};

/** Asks for the name of a new item (a profile, a timeline …) or a new name for an item. */
export function NameDialog({ request, texts, onSave, onClose }: NameDialogProps) {
  return (
    // The dialog has no trigger. Thus it calls onOpenChange only to close.
    <Dialog open={request !== null} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {request && <NameForm request={request} texts={texts} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

type NameFormProps = {
  request: NameRequest;
  texts: NameDialogTexts;
  onSave: (name: string) => void;
};

function NameForm({ request, texts, onSave }: NameFormProps) {
  const id = useId();
  const [name, setName] = useState(request.kind === "rename" ? request.name : "");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        // An empty name cannot get here: the submit button is off, and then Enter does not submit.
        onSave(name.trim());
      }}
    >
      <DialogHeader>
        <DialogTitle>{request.kind === "new" ? texts.newTitle : texts.renameTitle}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{texts.label}</Label>
        <Input
          id={id}
          value={name}
          placeholder={texts.placeholder}
          required
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={name.trim() === ""}>
          Speichern
        </Button>
      </DialogFooter>
    </form>
  );
}
