import { Button } from "@pocket-apps/ui/components/button";
import { Checkbox } from "@pocket-apps/ui/components/checkbox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { useState } from "react";
import { errorId } from "./dom-ids.ts";
import { FormField } from "./form-field.tsx";
import type { Station } from "./schema.ts";
import { fromLines, isMonth, toLines } from "./text.ts";
import { newId } from "./variants.ts";

export type StationFormProps = {
  /** `null` for a new station. */
  station: Station | null;
  onSave: (station: Station) => void;
};

/** The fields of a station: time range, title, subtitle and bullet points. */
export function StationForm({ station, onSave }: StationFormProps) {
  const [from, setFrom] = useState(station?.from ?? "");
  const [to, setTo] = useState(station?.to ?? "");
  const [ongoing, setOngoing] = useState(station !== null && station.to === null);
  const [title, setTitle] = useState(station?.title ?? "");
  const [subtitle, setSubtitle] = useState(station?.subtitle ?? "");
  const [bullets, setBullets] = useState(fromLines(station?.bullets ?? []));
  const [showErrors, setShowErrors] = useState(false);

  const fromError = isMonth(from) ? null : "Bitte einen Monat eingeben.";
  const toError = ongoing
    ? null
    : !isMonth(to)
      ? "Bitte einen Monat eingeben, oder „bis heute“ wählen."
      : isMonth(from) && to < from
        ? "Das Ende darf nicht vor dem Start liegen."
        : null;
  const titleError = title.trim() === "" ? "Bitte einen Titel eingeben." : null;

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (fromError !== null || toError !== null || titleError !== null) {
          setShowErrors(true);
          return;
        }
        onSave({
          id: station?.id ?? newId(),
          from,
          to: ongoing ? null : to,
          title: title.trim(),
          subtitle: subtitle.trim(),
          bullets: toLines(bullets),
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{station ? "Station bearbeiten" : "Station hinzufügen"}</DialogTitle>
        <DialogDescription>Zum Beispiel eine Stelle oder ein Studium.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="station-from" label="Von" error={showErrors ? fromError : null}>
          <Input
            id="station-from"
            type="month"
            min="1900-01"
            max="9999-12"
            value={from}
            aria-invalid={showErrors && fromError !== null}
            aria-describedby={showErrors && fromError ? errorId("station-from") : undefined}
            onChange={(event) => {
              setFrom(event.target.value);
            }}
          />
        </FormField>
        <FormField id="station-to" label="Bis" error={showErrors ? toError : null}>
          <Input
            id="station-to"
            type="month"
            min="1900-01"
            max="9999-12"
            value={ongoing ? "" : to}
            disabled={ongoing}
            aria-invalid={showErrors && toError !== null}
            aria-describedby={showErrors && toError ? errorId("station-to") : undefined}
            onChange={(event) => {
              setTo(event.target.value);
            }}
          />
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="station-ongoing"
          checked={ongoing}
          onCheckedChange={(checked) => {
            setOngoing(checked === true);
          }}
        />
        <Label htmlFor="station-ongoing">Bis heute („Seit …“ im Lebenslauf)</Label>
      </div>
      <FormField id="station-title" label="Titel" error={showErrors ? titleError : null}>
        <Input
          id="station-title"
          value={title}
          placeholder="z. B. Data Engineer"
          aria-invalid={showErrors && titleError !== null}
          aria-describedby={showErrors && titleError ? errorId("station-title") : undefined}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </FormField>
      <FormField id="station-subtitle" label="Zusatz" hint="Steht nach dem Titel, nicht fett.">
        <Input
          id="station-subtitle"
          value={subtitle}
          placeholder="z. B. Beispiel GmbH, Köln"
          onChange={(event) => {
            setSubtitle(event.target.value);
          }}
        />
      </FormField>
      <FormField id="station-bullets" label="Stichpunkte" hint="Ein Stichpunkt pro Zeile.">
        <Textarea
          id="station-bullets"
          rows={4}
          value={bullets}
          onChange={(event) => {
            setBullets(event.target.value);
          }}
        />
      </FormField>
      <DialogFooter>
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}
