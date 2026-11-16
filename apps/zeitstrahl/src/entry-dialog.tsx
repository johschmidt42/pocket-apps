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
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Trash2 } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import {
  parseDateInput,
  periodStart,
  PRECISION_LABELS,
  PRECISIONS,
  precisionOf,
  toDateInput,
  type Precision,
} from "./dates.ts";
import { SIDES, type Entry, type Side, type When } from "./schema.ts";
import { startOf } from "./timelines.ts";

const KINDS = ["point", "range", "ongoing"] as const;
type Kind = (typeof KINDS)[number];

const KIND_LABELS: Record<Kind, string> = {
  point: "Zeitpunkt",
  range: "Zeitraum",
  ongoing: "Bis heute",
};

const SIDE_LABELS: Record<Side, string> = {
  auto: "Automatisch (abwechselnd)",
  left: "Links",
  right: "Rechts",
};

/** What the dialog edits. A new entry starts with `precision`. */
export type EntryDraft = { kind: "new"; precision: Precision } | { kind: "edit"; entry: Entry };

/** What the user typed. The view adds the ID and keeps `visible`. */
export type EntryInput = Pick<Entry, "title" | "description" | "when" | "side">;

export type EntryDialogProps = {
  /** `null` closes the dialog. */
  draft: EntryDraft | null;
  onSave: (input: EntryInput) => void;
  /** Removes the edited entry. */
  onRemove: (entry: Entry) => void;
  onClose: () => void;
};

/** The dialog to add or change an entry. An existing entry can also be removed here. */
export function EntryDialog({ draft, onSave, onRemove, onClose }: EntryDialogProps) {
  return (
    <Dialog
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {draft && (
          <EntryForm
            key={draft.kind === "edit" ? draft.entry.id : "new"}
            draft={draft}
            onSave={onSave}
            onRemove={onRemove}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The end date of an entry, or `null` for a point and an ongoing range. */
function endOf(entry: Entry): string | null {
  return entry.when.kind === "range" ? entry.when.end : null;
}

type EntryFormProps = Pick<EntryDialogProps, "onSave" | "onRemove"> & { draft: EntryDraft };

function EntryForm({ draft, onSave, onRemove }: EntryFormProps) {
  const entry = draft.kind === "edit" ? draft.entry : null;
  const firstPrecision =
    draft.kind === "edit" ? precisionOf(startOf(draft.entry)) : draft.precision;
  const [title, setTitle] = useState(entry?.title ?? "");
  const [kind, setKind] = useState<Kind>(entry?.when.kind ?? "point");
  const [precision, setPrecision] = useState<Precision>(firstPrecision);
  const [start, setStart] = useState(entry ? toDateInput(startOf(entry), firstPrecision) : "");
  const savedEnd = entry ? endOf(entry) : null;
  const [end, setEnd] = useState(savedEnd === null ? "" : toDateInput(savedEnd, firstPrecision));
  const [side, setSide] = useState<Side>(entry?.side ?? "auto");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [showErrors, setShowErrors] = useState(false);

  const startValue = parseDateInput(start, precision);
  const endValue = parseDateInput(end, precision);
  const titleError = title.trim() === "" ? "Bitte eine Bezeichnung eingeben." : null;
  const startError = startValue === null ? "Bitte ein Datum eingeben." : null;
  const endError =
    kind !== "range"
      ? null
      : endValue === null
        ? "Bitte ein Datum eingeben."
        : startValue !== null && periodStart(endValue) < periodStart(startValue)
          ? "Das Ende liegt vor dem Anfang."
          : null;

  function when(): When | null {
    if (startValue === null) return null;
    switch (kind) {
      case "point":
        return { kind, date: startValue };
      case "ongoing":
        return { kind, start: startValue };
      case "range":
        return endValue === null ? null : { kind, start: startValue, end: endValue };
    }
  }

  /** A new precision converts the typed dates, for example "2026-11-14" to "2026-11". */
  function changePrecision(next: Precision) {
    const convert = (text: string) => {
      const value = parseDateInput(text, precision);
      return value === null ? "" : toDateInput(value, next);
    };
    setStart(convert(start));
    setEnd(convert(end));
    setPrecision(next);
  }

  const startLabel = kind === "point" ? "Datum" : kind === "range" ? "Von" : "Seit";
  const result = when();

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (titleError === null && endError === null && result !== null) {
          onSave({ title: title.trim(), description: description.trim(), when: result, side });
        } else {
          setShowErrors(true);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{entry ? "Eintrag bearbeiten" : "Neuer Eintrag"}</DialogTitle>
        <DialogDescription>
          Ein Zeitpunkt, zum Beispiel ein Arzttermin, oder ein Zeitraum, zum Beispiel ein Studium.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-title">Bezeichnung</Label>
        <Input
          id="entry-title"
          value={title}
          placeholder="z. B. Studium"
          aria-invalid={showErrors && titleError !== null}
          aria-describedby={showErrors && titleError ? "entry-title-error" : undefined}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
        {showErrors && titleError && <FieldError id="entry-title-error" text={titleError} />}
      </div>

      <div className="flex flex-col gap-2">
        <span id="entry-kind-label" className="text-sm leading-none font-medium">
          Art
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          aria-labelledby="entry-kind-label"
          className="flex-wrap"
          value={kind}
          onValueChange={(value) => {
            if (isOneOf(KINDS, value)) setKind(value);
          }}
        >
          {KINDS.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {KIND_LABELS[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-precision">Genauigkeit</Label>
        <NativeSelect
          id="entry-precision"
          className="w-full"
          value={precision}
          onChange={(event) => {
            if (isOneOf(PRECISIONS, event.target.value)) changePrecision(event.target.value);
          }}
        >
          {PRECISIONS.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {PRECISION_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          id="entry-start"
          label={startLabel}
          precision={precision}
          value={start}
          error={showErrors ? startError : null}
          onChange={setStart}
        />
        {kind === "range" && (
          <DateField
            id="entry-end"
            label="Bis"
            precision={precision}
            value={end}
            error={showErrors ? endError : null}
            onChange={setEnd}
          />
        )}
      </div>
      {kind === "ongoing" && (
        <p className="text-xs text-muted-foreground">
          Der Zeitraum geht bis heute und wird jeden Tag länger.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-side">Seite</Label>
        <NativeSelect
          id="entry-side"
          className="w-full"
          value={side}
          onChange={(event) => {
            if (isOneOf(SIDES, event.target.value)) setSide(event.target.value);
          }}
        >
          {SIDES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {SIDE_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-description">Beschreibung (optional)</Label>
        <Textarea
          id="entry-description"
          value={description}
          placeholder="Erscheint, wenn die Maus auf dem Eintrag ist."
          aria-describedby="entry-description-hint"
          onChange={(event) => {
            setDescription(event.target.value);
          }}
        />
        <p id="entry-description-hint" className="text-xs text-muted-foreground">
          „- “ am Zeilenanfang macht einen Listenpunkt, **Text** macht Text fett.
        </p>
      </div>

      <DialogFooter className="sm:justify-between">
        {entry ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              onRemove(entry);
            }}
          >
            <Trash2 data-icon="inline-start" />
            Löschen
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}

function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="text-sm text-destructive">
      {text}
    </p>
  );
}

type DateFieldProps = {
  id: string;
  label: string;
  precision: Precision;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
};

/** A date field for a day, a month field for a month, a number field for a year. */
function DateField({ id, label, precision, value, error, onChange }: DateFieldProps) {
  const errorId = `${id}-error`;
  const inputProps = {
    id,
    value,
    "aria-invalid": error !== null,
    "aria-describedby": error ? errorId : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
  };
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {precision === "day" && (
        <Input {...inputProps} type="date" min="0001-01-01" max="9999-12-31" />
      )}
      {precision === "month" && <Input {...inputProps} type="month" min="0001-01" max="9999-12" />}
      {precision === "year" && (
        <Input
          {...inputProps}
          type="number"
          inputMode="numeric"
          min={1}
          max={9999}
          placeholder="2026"
        />
      )}
      {error && <FieldError id={errorId} text={error} />}
    </div>
  );
}
