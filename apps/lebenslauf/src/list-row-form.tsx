import { Button } from "@pocket-apps/ui/components/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { useState } from "react";
import { errorId } from "./dom-ids.ts";
import { FormField } from "./form-field.tsx";
import type { ListRow } from "./schema.ts";
import { fromLines, toLines } from "./text.ts";
import { newId } from "./variants.ts";

export type ListRowFormProps = {
  /** `null` for a new row. */
  row: ListRow | null;
  onSave: (row: ListRow) => void;
};

/** The fields of a list row: a label and its values. */
export function ListRowForm({ row, onSave }: ListRowFormProps) {
  const [label, setLabel] = useState(row?.label ?? "");
  const [items, setItems] = useState(fromLines(row?.items ?? []));
  const [showErrors, setShowErrors] = useState(false);
  const labelError = label.trim() === "" ? "Bitte ein Label eingeben." : null;

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (labelError !== null) {
          setShowErrors(true);
          return;
        }
        onSave({ id: row?.id ?? newId(), label: label.trim(), items: toLines(items) });
      }}
    >
      <DialogHeader>
        <DialogTitle>{row ? "Zeile bearbeiten" : "Zeile hinzufügen"}</DialogTitle>
        <DialogDescription>Zum Beispiel „Sprachen“ mit einer Sprache pro Zeile.</DialogDescription>
      </DialogHeader>
      <FormField id="row-label" label="Label" error={showErrors ? labelError : null}>
        <Input
          id="row-label"
          value={label}
          placeholder="z. B. Sprachen"
          aria-invalid={showErrors && labelError !== null}
          aria-describedby={showErrors && labelError ? errorId("row-label") : undefined}
          onChange={(event) => {
            setLabel(event.target.value);
          }}
        />
      </FormField>
      <FormField id="row-items" label="Werte" hint="Ein Wert pro Zeile.">
        <Textarea
          id="row-items"
          rows={5}
          value={items}
          onChange={(event) => {
            setItems(event.target.value);
          }}
        />
      </FormField>
      <DialogFooter>
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}
