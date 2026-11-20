import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { useState } from "react";
import { SECTION_KINDS, type SectionKind } from "./schema.ts";
import { SECTION_KIND_INFO } from "./section-kinds.ts";

export type SectionDialogProps = {
  open: boolean;
  /** Gets the title without spaces at the start and the end. */
  onSave: (title: string, kind: SectionKind) => void;
  onClose: () => void;
};

/**
 * Asks for the title and the kind of a new section. A click on the title of a section renames
 * it in place (`SectionTitle`).
 */
export function SectionDialog({ open, onSave, onClose }: SectionDialogProps) {
  return (
    // The dialog has no trigger. Thus it calls onOpenChange only to close.
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {open && <SectionForm onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function SectionForm({ onSave }: { onSave: (title: string, kind: SectionKind) => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<SectionKind>("projects");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        // An empty title cannot get here: the submit button is off, and then Enter does not submit.
        onSave(title.trim(), kind);
      }}
    >
      <DialogHeader>
        <DialogTitle>Neuer Abschnitt</DialogTitle>
        <DialogDescription>
          Die Überschrift steht so im Lebenslauf, zum Beispiel „Projects“ oder „Berufserfahrung“.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="section-title">Überschrift</Label>
        <Input
          id="section-title"
          value={title}
          placeholder="z. B. Berufserfahrung"
          required
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="section-kind">Art der Einträge</Label>
        <NativeSelect
          id="section-kind"
          value={kind}
          onChange={(event) => {
            if (isOneOf(SECTION_KINDS, event.target.value)) setKind(event.target.value);
          }}
        >
          {SECTION_KINDS.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {SECTION_KIND_INFO[value].label} ({SECTION_KIND_INFO[value].fields})
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={title.trim() === ""}>
          Speichern
        </Button>
      </DialogFooter>
    </form>
  );
}
