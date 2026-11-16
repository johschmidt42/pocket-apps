import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Copy, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { DESIGN_INFO } from "./designs/designs.ts";
import { VARIANT_SELECT_ID } from "./dom-ids.ts";
import { LANGUAGE_LABELS } from "./designs/labels.ts";
import { LANGUAGES, type Language, type Variant } from "./schema.ts";

export type VariantBarProps = {
  /** True while the app saves or copies a photo. Then duplicate and delete wait. */
  busy: boolean;
  variants: readonly Variant[];
  active: Variant;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onRemove: () => void;
  onLanguage: (language: Language) => void;
  onPrint: () => void;
};

/** Picks the variant and its language. Adds, copies, renames, removes and prints variants. */
export function VariantBar(props: VariantBarProps) {
  const { active } = props;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <Label htmlFor={VARIANT_SELECT_ID}>Variante</Label>
        <div className="flex gap-1">
          <NativeSelect
            id={VARIANT_SELECT_ID}
            className="w-full sm:w-72"
            value={active.id}
            onChange={(event) => {
              props.onSelect(event.target.value);
            }}
          >
            {props.variants.map((variant) => (
              <NativeSelectOption key={variant.id} value={variant.id}>
                {variant.name} · {DESIGN_INFO[variant.design].label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Variante umbenennen"
            onClick={props.onRename}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Variante löschen"
            disabled={props.busy || props.variants.length < 2}
            onClick={props.onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={props.onNew}>
          <Plus data-icon="inline-start" />
          Neue Variante
        </Button>
        <Button variant="outline" disabled={props.busy} onClick={props.onDuplicate}>
          <Copy data-icon="inline-start" />
          Duplizieren
        </Button>
      </div>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        aria-label="Sprache der festen Wörter im Lebenslauf"
        value={active.language}
        onValueChange={(value) => {
          if (isOneOf(LANGUAGES, value)) props.onLanguage(value);
        }}
      >
        {LANGUAGES.map((language) => (
          <ToggleGroupItem key={language} value={language} aria-label={LANGUAGE_LABELS[language]}>
            {language.toUpperCase()}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button onClick={props.onPrint}>
        <Printer data-icon="inline-start" />
        Drucken / PDF
      </Button>
    </div>
  );
}
