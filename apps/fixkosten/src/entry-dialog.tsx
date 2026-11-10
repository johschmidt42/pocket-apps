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
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { useState } from "react";
import { CATEGORY_INFO } from "./categories.ts";
import { ICONS } from "./icons.ts";
import { centsToInput, INTERVAL_LABELS, MONTH_LABELS, parseEuro } from "./money.ts";
import { isOneOf } from "./one-of.ts";
import { newId } from "./profiles.ts";
import {
  CATEGORIES,
  ICON_NAMES,
  INTERVALS,
  type Category,
  type Cost,
  type IconName,
  type Income,
  type Interval,
} from "./schema.ts";
import { suggestFromName } from "./suggest.ts";

/** What the dialog edits. `entry` is `null` for a new entry. */
export type EntryDraft =
  { kind: "cost"; entry: Cost | null } | { kind: "income"; entry: Income | null };

/** The saved entry. */
export type SavedEntry = { kind: "cost"; entry: Cost } | { kind: "income"; entry: Income };

export type EntryDialogProps = {
  /** `null` closes the dialog. */
  draft: EntryDraft | null;
  onSave: (saved: SavedEntry) => void;
  onClose: () => void;
};

/** The dialog to add or change a cost or an income. */
export function EntryDialog({ draft, onSave, onClose }: EntryDialogProps) {
  return (
    <Dialog
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {draft && <EntryForm key={draft.entry?.id ?? draft.kind} draft={draft} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({ draft, onSave }: { draft: EntryDraft; onSave: (saved: SavedEntry) => void }) {
  const entry = draft.entry;
  const cost = draft.kind === "cost" ? draft.entry : null;
  const [name, setName] = useState(entry?.name ?? "");
  const [amount, setAmount] = useState(entry ? centsToInput(entry.amountCents) : "");
  const [interval, setInterval] = useState<Interval>(entry?.interval ?? "monthly");
  const [dueMonth, setDueMonth] = useState(entry?.dueMonth ?? new Date().getMonth() + 1);
  const [category, setCategory] = useState<Category>(cost?.category ?? "other");
  const [icon, setIcon] = useState<IconName>(cost?.icon ?? "receipt");
  // A new cost gets its category and icon from its name, until the user picks them.
  const [picked, setPicked] = useState({ category: entry !== null, icon: entry !== null });
  const [showErrors, setShowErrors] = useState(false);

  const amountCents = parseEuro(amount);
  const nameError = name.trim() === "" ? "Bitte einen Namen eingeben." : null;
  const amountError =
    amountCents === null ? "Bitte einen Betrag bis 10 Mio. € eingeben, z. B. 12,50." : null;
  const isCost = draft.kind === "cost";
  const what = isCost ? "Posten" : "Einkommen";

  function changeName(value: string) {
    setName(value);
    const suggestion = isCost ? suggestFromName(value) : null;
    if (!suggestion) return;
    if (!picked.category) setCategory(suggestion.category);
    if (!picked.icon) setIcon(suggestion.icon);
  }

  function changeCategory(value: string) {
    if (!isOneOf(CATEGORIES, value)) return;
    setCategory(value);
    setPicked((current) => ({ ...current, category: true }));
    if (!picked.icon) setIcon(CATEGORY_INFO[value].icon);
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (nameError !== null || amountCents === null) {
          setShowErrors(true);
          return;
        }
        const fields = {
          id: entry?.id ?? newId(),
          name: name.trim(),
          amountCents,
          interval,
          dueMonth,
        };
        onSave(
          isCost
            ? { kind: "cost", entry: { ...fields, category, icon } }
            : { kind: "income", entry: fields },
        );
      }}
    >
      <DialogHeader>
        <DialogTitle>{entry ? `${what} bearbeiten` : `${what} hinzufügen`}</DialogTitle>
        <DialogDescription>
          {isCost
            ? "Ein Posten ist eine regelmäßige Ausgabe, zum Beispiel die Miete."
            : "Zum Beispiel dein Nettogehalt oder Kindergeld."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-name">Name</Label>
        <Input
          id="entry-name"
          value={name}
          placeholder={isCost ? "z. B. Strom" : "z. B. Gehalt"}
          aria-invalid={showErrors && nameError !== null}
          aria-describedby={showErrors && nameError ? "entry-name-error" : undefined}
          onChange={(event) => {
            changeName(event.target.value);
          }}
        />
        {showErrors && nameError && (
          <p id="entry-name-error" className="text-sm text-destructive">
            {nameError}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="entry-amount">Betrag in Euro</Label>
          <Input
            id="entry-amount"
            inputMode="decimal"
            value={amount}
            placeholder="0,00"
            aria-invalid={showErrors && amountError !== null}
            aria-describedby={showErrors && amountError ? "entry-amount-error" : undefined}
            onChange={(event) => {
              setAmount(event.target.value);
            }}
          />
          {showErrors && amountError && (
            <p id="entry-amount-error" className="text-sm text-destructive">
              {amountError}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="entry-interval">Wie oft?</Label>
          <NativeSelect
            id="entry-interval"
            value={interval}
            onChange={(event) => {
              if (isOneOf(INTERVALS, event.target.value)) setInterval(event.target.value);
            }}
          >
            {INTERVALS.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {INTERVAL_LABELS[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {interval !== "monthly" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="entry-month">
            {interval === "yearly" ? "Fällig im" : "Erste Zahlung im Jahr"}
          </Label>
          <NativeSelect
            id="entry-month"
            value={String(dueMonth)}
            onChange={(event) => {
              setDueMonth(Number(event.target.value));
            }}
          >
            {MONTH_LABELS.map((label, index) => (
              <NativeSelectOption key={label} value={String(index + 1)}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}

      {isCost && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-category">Kategorie</Label>
            <NativeSelect
              id="entry-category"
              value={category}
              onChange={(event) => {
                changeCategory(event.target.value);
              }}
            >
              {CATEGORIES.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {CATEGORY_INFO[value].label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <span id="entry-icon-label" className="text-sm leading-none font-medium">
              Icon
            </span>
            <ToggleGroup
              type="single"
              variant="outline"
              aria-labelledby="entry-icon-label"
              className="flex-wrap justify-start"
              spacing={1}
              value={icon}
              onValueChange={(value) => {
                if (!isOneOf(ICON_NAMES, value)) return;
                setIcon(value);
                setPicked((current) => ({ ...current, icon: true }));
              }}
            >
              {ICON_NAMES.map((value) => {
                const Icon = ICONS[value].icon;
                return (
                  <ToggleGroupItem key={value} value={value} aria-label={ICONS[value].label}>
                    <Icon />
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}
