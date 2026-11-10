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
import { useState } from "react";

/** What the dialog does. */
export type ProfileNameRequest = { kind: "new" } | { kind: "rename"; name: string };

export type ProfileNameDialogProps = {
  /** `null` closes the dialog. */
  request: ProfileNameRequest | null;
  onSave: (name: string) => void;
  onClose: () => void;
};

/** Asks for the name of a new profile, or a new name for the active profile. */
export function ProfileNameDialog({ request, onSave, onClose }: ProfileNameDialogProps) {
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>{request && <NameForm request={request} onSave={onSave} />}</DialogContent>
    </Dialog>
  );
}

function NameForm({
  request,
  onSave,
}: {
  request: ProfileNameRequest;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(request.kind === "rename" ? request.name : "");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() !== "") onSave(name.trim());
      }}
    >
      <DialogHeader>
        <DialogTitle>{request.kind === "new" ? "Neues Profil" : "Profil umbenennen"}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-name">Name des Profils</Label>
        <Input
          id="profile-name"
          value={name}
          placeholder="z. B. Wohnung Berlin"
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
