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
import { DESIGN_INFO, DESIGNS } from "./designs/designs.ts";
import { LANGUAGE_LABELS } from "./designs/labels.ts";
import { LANGUAGES, type Design, type Language } from "./schema.ts";
import type { NewVariant } from "./variants.ts";

export type VariantChoice = Omit<NewVariant, "id">;

export type VariantDialogProps = {
  open: boolean;
  onSave: (choice: VariantChoice) => void;
  onClose: () => void;
};

/** Asks for the name, the design and the language of a new, empty variant. */
export function VariantDialog({ open, onSave, onClose }: VariantDialogProps) {
  return (
    // The dialog has no trigger. Thus it calls onOpenChange only to close.
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>{open && <VariantForm onSave={onSave} />}</DialogContent>
    </Dialog>
  );
}

function VariantForm({ onSave }: { onSave: (choice: VariantChoice) => void }) {
  const [name, setName] = useState("");
  const [design, setDesign] = useState<Design>("klassisch");
  const [language, setLanguage] = useState<Language>("de");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        // An empty name cannot get here: the submit button is off, and then Enter does not submit.
        onSave({ name: name.trim(), design, language });
      }}
    >
      <DialogHeader>
        <DialogTitle>Neue Variante</DialogTitle>
        <DialogDescription>
          Eine neue Variante startet leer. Name und Kontakt bleiben gleich. Um eine Variante als
          Vorlage zu nehmen, dupliziere sie.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="variant-name">Name der Variante</Label>
        <Input
          id="variant-name"
          value={name}
          placeholder="z. B. Firma X – Data Engineer"
          required
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="variant-design">Design</Label>
          <NativeSelect
            id="variant-design"
            value={design}
            onChange={(event) => {
              if (isOneOf(DESIGNS, event.target.value)) setDesign(event.target.value);
            }}
          >
            {DESIGNS.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {DESIGN_INFO[value].label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="variant-language">Sprache</Label>
          <NativeSelect
            id="variant-language"
            value={language}
            onChange={(event) => {
              if (isOneOf(LANGUAGES, event.target.value)) setLanguage(event.target.value);
            }}
          >
            {LANGUAGES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {LANGUAGE_LABELS[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Du kannst das Design später in der Leiste wechseln. Der Inhalt bleibt gleich.
      </p>
      <DialogFooter>
        <Button type="submit" disabled={name.trim() === ""}>
          Anlegen
        </Button>
      </DialogFooter>
    </form>
  );
}
